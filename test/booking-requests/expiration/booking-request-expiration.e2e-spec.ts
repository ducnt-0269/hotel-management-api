import { DateTime } from 'luxon';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { HOTEL_TIME_ZONE } from '../../../src/booking-requests/booking-request.constants.js';
import { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';
import { BookingRequestExpiration } from '../../../src/booking-requests/expiration/booking-request-expiration.entity.js';
import { BookingRequestExpirationService } from '../../../src/booking-requests/expiration/booking-request-expiration.service.js';
import { signIn } from '../../support/auth.js';
import { createTestApp } from '../../support/create-test-app.js';
import { createBookingRequest } from '../../support/factories/booking-request.factory.js';
import { createRoomType } from '../../support/factories/room-type.factory.js';
import {
  createUser,
  DEFAULT_PASSWORD,
} from '../../support/factories/user.factory.js';
import { resetDb } from '../../support/reset-db.js';

import type { INestApplication } from '@nestjs/common';

const day = (offset: number) =>
  DateTime.now()
    .setZone(HOTEL_TIME_ZONE)
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');

// The sweep is called directly rather than waited for. The real cron may
// still fire mid-test, so assertions are on end state only.
describe('booking request hold expiry (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  beforeEach(() => resetDb(app));

  const repository = <T extends object>(entity: new () => T) =>
    app.get(DataSource).getRepository(entity);

  it('expires overdue pending holds, logs the outcome and frees the rooms', async () => {
    const user = await createUser(app);
    const roomType = await createRoomType(app, { totalRooms: 1 });
    const overdue = await createBookingRequest(app, {
      user,
      roomType,
      checkInDate: day(10),
      checkOutDate: day(12),
      expiresAt: new Date(Date.now() - 60_000),
    });

    await app.get(BookingRequestExpirationService).expireOverdue();

    const stored = await repository(BookingRequest).findOneByOrFail({
      id: overdue.id,
    });
    expect(stored.status).toBe('expired');
    expect(
      await repository(BookingRequestExpiration).countBy({
        bookingRequestId: overdue.id,
      }),
    ).toBe(1);

    // Signed in first: awaiting inside the chain would run a second request
    // while this one is already bound to the server.
    const authorization = await signIn(app, user.email, DEFAULT_PASSWORD);
    await request(app.getHttpServer())
      .post('/api/booking-requests')
      .set('Authorization', authorization)
      .send({
        roomTypeId: Number(roomType.id),
        roomsRequested: 1,
        checkInDate: day(10),
        checkOutDate: day(12),
      })
      .expect(201);
  });

  it('leaves holds that are not yet due, and decided requests, alone', async () => {
    const user = await createUser(app);
    const roomType = await createRoomType(app, { totalRooms: 5 });
    const stay = {
      user,
      roomType,
      checkInDate: day(10),
      checkOutDate: day(12),
    };
    const notYetDue = await createBookingRequest(app, stay);
    const approved = await createBookingRequest(app, {
      ...stay,
      status: 'approved',
      expiresAt: new Date(Date.now() - 60_000),
    });

    await app.get(BookingRequestExpirationService).expireOverdue();

    const rows = await repository(BookingRequest).find({
      order: { id: 'ASC' },
    });
    expect(rows.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: notYetDue.id, status: 'pending' },
      { id: approved.id, status: 'approved' },
    ]);
    expect(await repository(BookingRequestExpiration).count()).toBe(0);
  });

  it('is idempotent: a second sweep expires nothing more', async () => {
    const user = await createUser(app);
    const roomType = await createRoomType(app);
    await createBookingRequest(app, {
      user,
      roomType,
      checkInDate: day(10),
      checkOutDate: day(12),
      expiresAt: new Date(Date.now() - 60_000),
    });

    const sweeps = await Promise.all([
      app.get(BookingRequestExpirationService).expireOverdue(),
      app.get(BookingRequestExpirationService).expireOverdue(),
    ]);

    // Sum, not [0, 1]: the real cron may claim the row first and leave both at 0.
    expect(sweeps[0] + sweeps[1]).toBeLessThanOrEqual(1);
    expect(await repository(BookingRequestExpiration).count()).toBe(1);
  });
});
