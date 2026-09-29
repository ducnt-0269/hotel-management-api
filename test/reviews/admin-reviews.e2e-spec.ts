import request from 'supertest';

import { signIn } from '../support/auth.js';
import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import {
  createReview,
  createRejectedReview,
} from '../support/factories/review.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { ReviewAttributes } from '../support/factories/review.factory.js';
import type { INestApplication } from '@nestjs/common';

const stay = { checkInDate: '2026-01-01', checkOutDate: '2026-01-05' };

describe('admin reviews (e2e)', () => {
  let app: INestApplication;
  let admin: User;
  let guest: User;
  let roomType: RoomType;
  let adminToken: string;
  let guestToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    admin = await createUser(app, { role: 'admin' });
    guest = await createUser(app);
    roomType = await createRoomType(app);
    adminToken = await signIn(app, admin.email, DEFAULT_PASSWORD);
    guestToken = await signIn(app, guest.email, DEFAULT_PASSWORD);
  });

  const get = (query = '', token = adminToken) =>
    request(app.getHttpServer())
      .get(`/api/admin/reviews${query}`)
      .set('Authorization', token);

  const ids = (body: { data: { id: number }[] }) =>
    body.data.map((item) => item.id);

  const stageBookingRequest = () =>
    createBookingRequest(app, { user: guest, roomType, ...stay });

  const stageReview = async (
    overrides: Omit<ReviewAttributes, 'bookingRequest'> = {},
  ) =>
    createReview(app, {
      bookingRequest: await stageBookingRequest(),
      ...overrides,
    });

  const stageRejectedReview = async (reason?: string) =>
    createRejectedReview(app, {
      bookingRequest: await stageBookingRequest(),
      admin,
      reason,
    });

  it('returns reviews of every status without a filter', async () => {
    const pending = await stageReview({ status: 'pending' });
    const approved = await stageReview({ status: 'approved' });
    const rejected = await stageRejectedReview();

    const res = await get().expect(200);

    const expected = [pending, approved, rejected].map((review) =>
      Number(review.id),
    );
    expect(ids(res.body)).toHaveLength(expected.length);
    expect(ids(res.body)).toEqual(expect.arrayContaining(expected));
  });

  it('filters by status', async () => {
    const pending = await stageReview({ status: 'pending' });
    const approved = await stageReview({ status: 'approved' });
    const rejected = await stageRejectedReview();

    const approvedRes = await get('?status=approved').expect(200);
    expect(ids(approvedRes.body)).toEqual([Number(approved.id)]);

    const rejectedRes = await get('?status=rejected').expect(200);
    expect(ids(rejectedRes.body)).toEqual([Number(rejected.id)]);

    const pendingRes = await get('?status=pending').expect(200);
    expect(ids(pendingRes.body)).toEqual([Number(pending.id)]);
  });

  it('lists newest first', async () => {
    const older = await stageReview({
      status: 'pending',
      createdAt: new Date('2026-01-10T00:00:00Z'),
    });
    const newer = await stageReview({
      status: 'pending',
      createdAt: new Date('2026-01-12T00:00:00Z'),
    });

    const res = await get().expect(200);

    expect(ids(res.body)).toEqual([Number(newer.id), Number(older.id)]);
  });

  it('pages the list', async () => {
    await stageReview({
      status: 'pending',
      createdAt: new Date('2026-01-10T00:00:00Z'),
    });
    await stageReview({
      status: 'pending',
      createdAt: new Date('2026-01-11T00:00:00Z'),
    });
    const newest = await stageReview({
      status: 'pending',
      createdAt: new Date('2026-01-12T00:00:00Z'),
    });

    const res = await get('?page=1&perPage=1').expect(200);

    expect(res.body.meta).toEqual({ total: 3, page: 1, perPage: 1 });
    expect(ids(res.body)).toEqual([Number(newest.id)]);
  });

  it('includes the guest who left each review', async () => {
    const review = await stageReview({ status: 'pending' });

    const res = await get().expect(200);

    expect(res.body.data[0].user).toEqual({
      id: Number(guest.id),
      email: guest.email,
      fullName: guest.fullName,
    });
    expect(res.body.data[0].id).toBe(Number(review.id));
  });

  it('fills in the rejection reason for a rejected review', async () => {
    await stageRejectedReview('Comment breaches the review guidelines');

    const res = await get('?status=rejected').expect(200);

    expect(res.body.data[0].rejection).toMatchObject({
      reason: 'Comment breaches the review guidelines',
    });
  });

  it('turns guests away', async () => {
    await get('', guestToken).expect(403);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer()).get('/api/admin/reviews').expect(401);
  });
});
