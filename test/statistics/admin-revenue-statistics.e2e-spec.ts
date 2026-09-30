import request from 'supertest';

import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import {
  createPayment,
  createPaymentSession,
} from '../support/factories/payment-session.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

const stay = { checkInDate: '2026-06-01', checkOutDate: '2026-06-03' };
const firstQuarter = 'from=2026-01-01&to=2026-03-31';

describe('admin revenue statistics (e2e)', () => {
  let app: INestApplication;
  let guest: User;
  let standard: RoomType;
  let deluxe: RoomType;
  let adminToken: string;
  let guestToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    const admin = await createUser(app, { role: 'admin' });
    guest = await createUser(app);
    standard = await createRoomType(app, { name: 'Standard Twin' });
    deluxe = await createRoomType(app, { name: 'Deluxe Sea View' });
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
  });

  const get = (query: string, token = adminToken) =>
    request(app.getHttpServer())
      .get(`/api/admin/statistics/revenue?${query}`)
      .set('Authorization', token);

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

  describe('groupBy=month', () => {
    it('sums each month with payments, oldest first, and totals them', async () => {
      await stagePayment(standard, 1_000_000, '2026-01-10T03:00:00Z');
      await stagePayment(deluxe, 2_500_000, '2026-01-20T03:00:00Z');
      await stagePayment(standard, 4_000_000, '2026-03-05T03:00:00Z');
      await stagePayment(standard, 9_000_000, '2026-04-02T03:00:00Z');

      const res = await get(`${firstQuarter}&groupBy=month`).expect(200);

      expect(res.body).toEqual({
        groupBy: 'month',
        from: '2026-01-01',
        to: '2026-03-31',
        currency: 'VND',
        totalRevenue: 7_500_000,
        data: [
          { key: '2026-01', revenue: 3_500_000, payments: 2 },
          { key: '2026-03', revenue: 4_000_000, payments: 1 },
        ],
      });
    });

    it('cuts days and months in hotel time, counting the whole of `to`', async () => {
      // 23:30 on Jan 31 and 00:30 on Feb 1 in Asia/Ho_Chi_Minh (UTC+7).
      await stagePayment(standard, 1_000_000, '2026-01-31T16:30:00Z');
      await stagePayment(standard, 2_000_000, '2026-01-31T17:30:00Z');
      // 23:59 on Feb 28, hotel time: still inside `to`.
      await stagePayment(standard, 4_000_000, '2026-02-28T16:59:00Z');
      // 00:00 on Mar 1, hotel time: the first moment past `to`.
      await stagePayment(standard, 8_000_000, '2026-02-28T17:00:00Z');

      const res = await get(
        'from=2026-01-01&to=2026-02-28&groupBy=month',
      ).expect(200);

      expect(res.body.data).toEqual([
        { key: '2026-01', revenue: 1_000_000, payments: 1 },
        { key: '2026-02', revenue: 6_000_000, payments: 2 },
      ]);
      expect(res.body.totalRevenue).toBe(7_000_000);
    });

    it('counts only recorded payments, not approved requests left unpaid', async () => {
      await createBookingRequest(app, {
        user: guest,
        roomType: standard,
        ...stay,
        totalAmount: '5000000',
        status: 'approved',
      });

      const res = await get(`${firstQuarter}&groupBy=month`).expect(200);

      expect(res.body).toMatchObject({ totalRevenue: 0, data: [] });
    });
  });

  describe('groupBy=roomType', () => {
    it('sums each room type with payments, highest revenue first', async () => {
      await stagePayment(standard, 1_000_000, '2026-01-10T03:00:00Z');
      await stagePayment(standard, 1_500_000, '2026-02-10T03:00:00Z');
      await stagePayment(deluxe, 6_000_000, '2026-03-10T03:00:00Z');
      await createRoomType(app, { name: 'Unsold Suite' });

      const res = await get(`${firstQuarter}&groupBy=roomType`).expect(200);

      expect(res.body).toEqual({
        groupBy: 'roomType',
        from: '2026-01-01',
        to: '2026-03-31',
        currency: 'VND',
        totalRevenue: 8_500_000,
        data: [
          {
            key: { id: Number(deluxe.id), name: 'Deluxe Sea View' },
            revenue: 6_000_000,
            payments: 1,
          },
          {
            key: { id: Number(standard.id), name: 'Standard Twin' },
            revenue: 2_500_000,
            payments: 2,
          },
        ],
      });
    });
  });

  describe('roomTypeId', () => {
    beforeEach(async () => {
      await stagePayment(standard, 1_000_000, '2026-01-10T03:00:00Z');
      await stagePayment(deluxe, 6_000_000, '2026-01-12T03:00:00Z');
    });

    it('counts only that room type', async () => {
      const res = await get(
        `${firstQuarter}&groupBy=month&roomTypeId=${deluxe.id}`,
      ).expect(200);

      expect(res.body).toMatchObject({
        totalRevenue: 6_000_000,
        data: [{ key: '2026-01', revenue: 6_000_000, payments: 1 }],
      });
    });

    it('returns an empty report for an unknown room type', async () => {
      const res = await get(
        `${firstQuarter}&groupBy=roomType&roomTypeId=999999`,
      ).expect(200);

      expect(res.body).toMatchObject({ totalRevenue: 0, data: [] });
    });
  });

  describe('validation', () => {
    it.each([
      ['from is missing', 'to=2026-03-31&groupBy=month', 'from'],
      ['to is missing', 'from=2026-01-01&groupBy=month', 'to'],
      ['groupBy is missing', firstQuarter, 'groupBy'],
      ['groupBy is unknown', `${firstQuarter}&groupBy=week`, 'groupBy'],
      [
        'from is not a date',
        'from=2026-13-01&to=2026-03-31&groupBy=month',
        'from',
      ],
      ['from is after to', 'from=2026-04-01&to=2026-03-31&groupBy=month', 'to'],
      [
        'roomTypeId is not an id',
        `${firstQuarter}&groupBy=month&roomTypeId=0`,
        'roomTypeId',
      ],
    ])('rejects a query where %s', async (_case, query, field) => {
      const res = await get(query).expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringMatching(`^${field}: `)]),
      );
    });

    it('accepts a single day', async () => {
      await stagePayment(standard, 1_000_000, '2026-01-10T03:00:00Z');

      const res = await get(
        'from=2026-01-10&to=2026-01-10&groupBy=month',
      ).expect(200);

      expect(res.body.totalRevenue).toBe(1_000_000);
    });
  });

  describe('access', () => {
    it('refuses a guest', () =>
      get(`${firstQuarter}&groupBy=month`, guestToken).expect(403));

    it('refuses a caller without a token', () =>
      request(app.getHttpServer())
        .get(`/api/admin/statistics/revenue?${firstQuarter}&groupBy=month`)
        .expect(401));
  });
});
