import request from 'supertest';
import { DataSource } from 'typeorm';

import { ReviewApproval } from '../../../src/reviews/approval/entities/review-approval.entity.js';
import { Review } from '../../../src/reviews/entities/review.entity.js';
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

import type { RoomType } from '../../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../../src/users/entities/user.entity.js';
import type { ReviewAttributes } from '../../support/factories/review.factory.js';
import type { INestApplication } from '@nestjs/common';

const stay = { checkInDate: '2026-01-01', checkOutDate: '2026-01-05' };

describe('admin review approval (e2e)', () => {
  let app: INestApplication;
  let admin: User;
  let guest: User;
  let roomType: RoomType;
  let adminToken: string;

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
  });

  const approve = (id: string | number, token = adminToken) =>
    request(app.getHttpServer())
      .post(`/api/admin/reviews/${id}/approval`)
      .set('Authorization', token);

  const stagePendingReview = async (
    overrides: Pick<ReviewAttributes, 'status'> = {},
  ) => {
    const bookingRequest = await createBookingRequest(app, {
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

  const approvals = () => app.get(DataSource).getRepository(ReviewApproval);

  const storedStatus = async (id: string) =>
    (await app.get(DataSource).getRepository(Review).findOneByOrFail({ id }))
      .status;

  it('approves a pending review and records who approved it', async () => {
    const review = await stagePendingReview();

    const res = await approve(review.id).expect(201);

    expect(res.body).toEqual({
      reviewId: Number(review.id),
      adminUserId: Number(admin.id),
      createdAt: expect.any(String),
    });
    expect(await storedStatus(review.id)).toBe('approved');
    expect(await approvals().countBy({ reviewId: review.id })).toBe(1);
  });

  it('shows the approved review on the room type', async () => {
    const review = await stagePendingReview();

    await approve(review.id).expect(201);

    const res = await request(app.getHttpServer()).get(
      `/api/room-types/${roomType.id}/reviews`,
    );
    expect(res.body.data.map((r: { id: number }) => r.id)).toContain(
      Number(review.id),
    );
  });

  it('returns 404 for an unknown id', async () => {
    const res = await approve(999999).expect(404);

    expect(res.body.message).toBe('Review not found');
  });

  it('rejects a non-numeric id', async () => {
    await approve('abc').expect(400);
  });

  it.each([
    ['approved', () => stagePendingReview({ status: 'approved' })],
    ['rejected', () => stageRejectedReview()],
  ] as const)('refuses an already %s review', async (_status, stage) => {
    const review = await stage();

    const res = await approve(review.id).expect(409);

    expect(res.body.message).toBe('Review is not pending');
  });

  it('approves only one of two concurrent decisions on the same review', async () => {
    const review = await stagePendingReview();
    const reject = (token = adminToken) =>
      request(app.getHttpServer())
        .post(`/api/admin/reviews/${review.id}/rejection`)
        .set('Authorization', token)
        .send({ reason: 'Comment breaches the review guidelines' });

    const [first, second] = await Promise.all([approve(review.id), reject()]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([201, 409]);
    expect(['approved', 'rejected']).toContain(await storedStatus(review.id));
  });

  it('turns guests away', async () => {
    const review = await stagePendingReview();

    await approve(
      review.id,
      await signIn(app, guest.email, DEFAULT_PASSWORD),
    ).expect(403);
  });

  it('requires a token', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/reviews/1/approval')
      .expect(401);
  });
});
