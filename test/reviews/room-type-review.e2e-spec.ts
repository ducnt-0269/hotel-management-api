import request from 'supertest';

import { createTestApp } from '../support/create-test-app.js';
import { createBookingRequest } from '../support/factories/booking-request.factory.js';
import { createReview } from '../support/factories/review.factory.js';
import { createRoomType } from '../support/factories/room-type.factory.js';
import { createUser } from '../support/factories/user.factory.js';
import { resetDb } from '../support/reset-db.js';

import type { RoomType } from '../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

const stay = { checkInDate: '2026-01-01', checkOutDate: '2026-01-05' };

describe('room type reviews (e2e)', () => {
  let app: INestApplication;
  let guest: User;
  let roomType: RoomType;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await resetDb(app);
    guest = await createUser(app);
    roomType = await createRoomType(app);
  });

  const list = (id: string | number, query = '') =>
    request(app.getHttpServer()).get(`/api/room-types/${id}/reviews${query}`);

  const bookFor = (type: RoomType) =>
    createBookingRequest(app, { user: guest, roomType: type, ...stay });

  it('returns only approved reviews, newest first, with no auth needed', async () => {
    const older = await createReview(app, {
      bookingRequest: await bookFor(roomType),
      status: 'approved',
      comment: 'Older approved review',
      createdAt: new Date('2026-01-10T00:00:00Z'),
    });
    const newer = await createReview(app, {
      bookingRequest: await bookFor(roomType),
      status: 'approved',
      comment: 'Newer approved review',
      createdAt: new Date('2026-01-12T00:00:00Z'),
    });
    await createReview(app, {
      bookingRequest: await bookFor(roomType),
      status: 'pending',
      comment: 'Still awaiting moderation',
    });
    await createReview(app, {
      bookingRequest: await bookFor(roomType),
      status: 'rejected',
      comment: 'Rejected by an admin',
    });

    const res = await list(roomType.id).expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.map((r: { id: number }) => r.id)).toEqual([
      Number(newer.id),
      Number(older.id),
    ]);
    expect(res.body.data[0]).toMatchObject({
      roomTypeId: Number(roomType.id),
      status: 'approved',
    });
  });

  it('only includes reviews for the requested room type', async () => {
    const otherRoomType = await createRoomType(app);
    await createReview(app, {
      bookingRequest: await bookFor(otherRoomType),
      status: 'approved',
    });
    const own = await createReview(app, {
      bookingRequest: await bookFor(roomType),
      status: 'approved',
    });

    const res = await list(roomType.id).expect(200);

    expect(res.body.data.map((r: { id: number }) => r.id)).toEqual([
      Number(own.id),
    ]);
  });

  it('paginates with page and perPage', async () => {
    for (let i = 0; i < 3; i++) {
      await createReview(app, {
        bookingRequest: await bookFor(roomType),
        status: 'approved',
        createdAt: new Date(Date.UTC(2026, 0, 10 + i)),
      });
    }

    const res = await list(roomType.id, '?page=2&perPage=2').expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ total: 3, page: 2, perPage: 2 });
  });

  it('returns 404 for an unknown room type', async () => {
    const res = await list(999999).expect(404);

    expect(res.body.message).toBe('Room type not found');
  });

  it('rejects a non-numeric id', async () => {
    await list('abc').expect(400);
  });
});
