import { DateTime } from 'luxon';

import { createMailRenderer } from '../../../test/support/mail-renderer.js';
import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';
import { monthlyRevenueReportEmail } from './monthly-revenue-report-email.js';

import type { MailRenderer } from '../../../test/support/mail-renderer.js';
import type { RevenueStatisticsResponse } from '../../statistics/schemas/revenue-statistics.schema.js';

const admin = { fullName: 'Trần Thị Bình' };
const september = DateTime.fromISO('2026-09-01', { zone: HOTEL_TIME_ZONE });
const report: RevenueStatisticsResponse = {
  groupBy: 'roomType',
  from: '2026-09-01',
  to: '2026-09-30',
  currency: 'VND',
  totalRevenue: 45_500_000,
  data: [
    {
      key: { id: 3, name: 'Deluxe Sea View' },
      revenue: 30_000_000,
      payments: 8,
    },
    { key: { id: 1, name: 'Standard Twin' }, revenue: 15_500_000, payments: 7 },
  ],
};
const emptyReport: RevenueStatisticsResponse = {
  ...report,
  totalRevenue: 0,
  data: [],
};

let i18n: MailRenderer['i18n'];
let render: MailRenderer['render'];

beforeAll(async () => {
  ({ i18n, render } = await createMailRenderer());
});

describe('monthly revenue report email', () => {
  it('puts the month in the subject and every room type in the text', () => {
    const mail = monthlyRevenueReportEmail(
      i18n,
      'vi',
      admin,
      september,
      report,
    );

    expect(mail.subject).toBe('Báo cáo doanh thu tháng 09/2026');
    expect(mail.text).toContain('Xin chào Trần Thị Bình,');
    expect(mail.text).toMatch(/Tổng doanh thu: 45\.500\.000\s₫/);
    expect(mail.text).toContain('Lượt thanh toán: 15');
    expect(mail.text).toMatch(/Deluxe Sea View: 30\.000\.000\s₫ \(8 lượt\)/);
    expect(mail.text).toMatch(/Standard Twin: 15\.500\.000\s₫ \(7 lượt\)/);
  });

  it('says so when the month took nothing', () => {
    const mail = monthlyRevenueReportEmail(
      i18n,
      'vi',
      admin,
      september,
      emptyReport,
    );

    expect(mail.text).toContain('Tháng này không có khoản thanh toán nào.');
    expect(mail.text).toMatch(/Tổng doanh thu: 0\s₫/);
  });

  it('compiles to email-ready HTML with the table and the admin footer', async () => {
    const html = await render(
      monthlyRevenueReportEmail(i18n, 'vi', admin, september, report),
    );

    expect(html).toContain('<table');
    expect(html).toContain('Loại phòng');
    expect(html).toContain('Deluxe Sea View');
    expect(html).toMatch(/45\.500\.000\s₫/);
    expect(html).toContain('quản trị viên của Hotel Management');
    expect(html).not.toContain('đăng ký tài khoản');
  });

  it('compiles an empty month with only the zero total, no room type rows', async () => {
    const html = await render(
      monthlyRevenueReportEmail(i18n, 'vi', admin, september, emptyReport),
    );

    expect(html).toContain('Tháng này không có khoản thanh toán nào.');
    expect(html).toMatch(/Tổng doanh thu[\s\S]*0\s₫/);
    // The table's column header; the body text writes it in lower case.
    expect(html).not.toContain('Loại phòng');
  });
});
