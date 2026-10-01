import { DateTime } from 'luxon';

import { HOTEL_TIME_ZONE } from '../../src/booking-requests/booking-request.constants.js';
import { MonthlyRevenueReportService } from '../../src/statistics/monthly-revenue-report.service.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import {
  createPayment,
  createPaymentSession,
} from '../support/factories/payment-session.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import { createUser } from '../support/factories/user.factory.js';
import { clearMailbox, countMail, waitForMail } from '../support/mailpit.js';
import { resetDb } from '../support/reset-db.js';

import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

const august = DateTime.fromISO('2026-08-01', { zone: HOTEL_TIME_ZONE });
const stay = { checkInDate: '2026-10-01', checkOutDate: '2026-10-03' };

// The report is sent by calling the service directly rather than waiting for
// the cron, which only fires on the 1st.
describe('monthly revenue report (e2e)', () => {
  let app: INestApplication;
  let admin: User;
  let guest: User;
  let standard: RoomType;
  let deluxe: RoomType;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await Promise.all([resetDb(app), clearMailbox()]);
    admin = await createUser(app, { role: 'admin', fullName: 'Trần Thị Bình' });
    guest = await createUser(app);
    standard = await createRoomType(app, { name: 'Standard Twin' });
    deluxe = await createRoomType(app, { name: 'Deluxe Sea View' });
  });

  const send = () => app.get(MonthlyRevenueReportService).sendForMonth(august);

  // An approved request paid in full at `paidAt` (an ISO instant).
  const stagePayment = async (
    roomType: RoomType,
    amount: number,
    paidAt: string,
  ) => {
    const bookingRequest = await createBookingRequest(app, {
      user: guest,
      roomType,
      ...stay,
      totalAmount: String(amount),
      status: 'approved',
    });
    const paymentSession = await createPaymentSession(app, {
      bookingRequest,
      status: 'completed',
    });
    await createPayment(app, { paymentSession, paidAt: new Date(paidAt) });
  };

  it("mails an active admin the month's revenue by room type", async () => {
    await stagePayment(deluxe, 6_000_000, '2026-08-10T03:00:00Z');
    await stagePayment(standard, 1_500_000, '2026-08-20T03:00:00Z');
    // 23:30 on Aug 31, hotel time: the last minutes of the month still count.
    await stagePayment(standard, 1_000_000, '2026-08-31T16:30:00Z');
    // 00:30 on Sep 1 and 23:30 on Jul 31, hotel time: outside the month.
    await stagePayment(deluxe, 9_000_000, '2026-08-31T17:30:00Z');
    await stagePayment(deluxe, 9_000_000, '2026-07-31T16:30:00Z');

    expect(await send()).toBe(1);

    const mail = await waitForMail(admin.email);
    expect(mail.Subject).toBe('Báo cáo doanh thu tháng 08/2026');
    expect(mail.Text).toContain('Xin chào Trần Thị Bình,');
    expect(mail.Text).toMatch(/Tổng doanh thu: 8\.500\.000\s₫/);
    expect(mail.Text).toContain('Lượt thanh toán: 3');
    expect(mail.Text).toMatch(/Deluxe Sea View: 6\.000\.000\s₫ \(1 lượt\)/);
    expect(mail.Text).toMatch(/Standard Twin: 2\.500\.000\s₫ \(2 lượt\)/);
    expect(mail.HTML).toContain('quản trị viên của Hotel Management');
  });

  it('skips deactivated admins and guests', async () => {
    const deactivated = await createUser(app, {
      role: 'admin',
      status: 'deactivated',
    });

    expect(await send()).toBe(1);

    // Once the active admin's mail has landed, any other would have too.
    await waitForMail(admin.email);
    expect(await countMail(deactivated.email)).toBe(0);
    expect(await countMail(guest.email)).toBe(0);
  });

  it('reports the month that just ended in hotel time when the cron fires', async () => {
    await stagePayment(standard, 3_000_000, '2026-09-15T03:00:00Z');

    // 00:05 on Oct 1 in the hotel is still Sep 30 in UTC.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T17:05:00Z'));
    try {
      await app.get(MonthlyRevenueReportService).sendForLastMonth();
    } finally {
      vi.useRealTimers();
    }

    const mail = await waitForMail(admin.email);
    expect(mail.Subject).toBe('Báo cáo doanh thu tháng 09/2026');
    expect(mail.Text).toMatch(/Tổng doanh thu: 3\.000\.000\s₫/);
  });

  it('still mails a month that took nothing', async () => {
    expect(await send()).toBe(1);

    const mail = await waitForMail(admin.email);
    expect(mail.Text).toContain('Tháng này không có khoản thanh toán nào.');
  });
});
