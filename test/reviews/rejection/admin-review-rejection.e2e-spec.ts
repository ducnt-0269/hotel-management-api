import request from 'supertest';
import { DataSource } from 'typeorm';

import { Review } from '../../../src/reviews/entities/review.entity.js';
import { ReviewRejection } from '../../../src/reviews/rejection/entities/review-rejection.entity.js';
import { signIn } from '../../support/auth.js';
import { createTestApp } from '../../support/create-test-app.js';
import { createBookingRequest } from '../../support/factories/booking-request.factory.js';
import {
  createRejectedReview,
  createReview,
} from '../../support/factories/review.factory.js';
import { createRoomType } from '../../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../../support/factories/user.factory.js';
import { resetDb } from '../../support/reset-db.js';

import type { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
import type { RoomType } from '../../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../../src/users/entities/user.entity.js';
import type { ReviewAttributes } from '../../support/factories/review.factory.js';
import type { INestApplication } from '@nestjs/common';

const stay = { checkInDate: '2026-01-01', checkOutDate: '2026-01-05' };
const reason = 'Comment breaches the review guidelines';

describe('admin review rejection (e2e)', () => {
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

  const reject = (
    id: string | number,
    body: object = { reason },
    token = adminToken,
  ) =>
    request(app.getHttpServer())
      .post(`/api/admin/reviews/${id}/rejection`)
      .set('Authorization', token)
      .send(body);

  const approve = (id: string | number, token = adminToken) =>
    request(app.getHttpServer())
      .post(`/api/admin/reviews/${id}/approval`)
      .set('Authorization', token);

  let bookingRequest: BookingRequest;

  const stagePendingReview = async (
    overrides: Pick<ReviewAttributes, 'status'> = {},
  ) => {
    bookingRequest = await createBookingRequest(app, {
      user: guest,
      roomType,
      ...stay,
    });
    return createReview(app, {
      bookingRequest,
      status: 'pending',
      ...overrides,
    });
  };

  const stageRejectedReview = async () =>
    createRejectedReview(app, {
      bookingRequest: await createBookingRequest(app, {
        user: guest,
        roomType,
        ...stay,
      }),
      admin,
    });

  const rejections = () => app.get(DataSource).getRepository(ReviewRejection);

  const storedStatus = async (id: string) =>
    (await app.get(DataSource).getRepository(Review).findOneByOrFail({ id }))
      .status;

  it('rejects a pending review and records the reason', async () => {
    const review = await stagePendingReview();

    const res = await reject(review.id, { reason: `  ${reason}  ` }).expect(
      201,
    );

    expect(res.body).toEqual({
      reviewId: Number(review.id),
      adminUserId: Number(admin.id),
      reason,
      createdAt: expect.any(String),
    });
    expect(await storedStatus(review.id)).toBe('rejected');
    const stored = await rejections().findBy({ reviewId: review.id });
    expect(stored.map((row) => row.reason)).toEqual([reason]);
  });

  it('shows the guest the reason on their own review', async () => {
    const review = await stagePendingReview();

    await reject(review.id).expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/booking-requests/${bookingRequest.id}/review`)
      .set('Authorization', guestToken)
      .expect(200);

    expect(res.body.rejection).toEqual({
      reason,
      createdAt: expect.any(String),
    });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await reject(999999).expect(404);

    expect(res.body.message).toBe('Review not found');
  });

  it('rejects a non-numeric id', async () => {
    await reject('abc').expect(400);
  });

  it.each([
    ['approved', () => stagePendingReview({ status: 'approved' })],
    ['rejected', () => stageRejectedReview()],
  ] as const)('refuses an already %s review', async (_status, stage) => {
    const review = await stage();

    const res = await reject(review.id).expect(409);

    expect(res.body.message).toBe('Review is not pending');
  });

  it.each([{}, { reason: '' }, { reason: '   ' }, { reason: 'x'.repeat(501) }])(
    'refuses a missing, blank or overlong reason (%o)',
    async (body) => {
      const review = await stagePendingReview();

      await reject(review.id, body).expect(400);

      expect(await storedStatus(review.id)).toBe('pending');
    },
  );

  it('rejects only one of two concurrent decisions on the same review', async () => {
    const review = await stagePendingReview();

    const [first, second] = await Promise.all([
      reject(review.id),
      approve(review.id),
    ]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
    expect(['approved', 'rejected']).toContain(await storedStatus(review.id));
  });

  it('turns guests away', async () => {
    const review = await stagePendingReview();

    await reject(review.id, { reason }, guestToken).expect(403);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/reviews/1/rejection')
      .send({ reason })
      .expect(401);
  });
});
