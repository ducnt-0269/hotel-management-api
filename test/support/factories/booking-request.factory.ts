import { DataSource } from 'typeorm';

import { HOLD_HOURS } from '../../../src/booking-requests/booking-request.constants.js';
import { BookingRequest } from '../../../src/booking-requests/entities/booking-request.entity.js';

import type { BookingRequestStatus } from '../../../src/booking-requests/entities/booking-request.entity.js';
import type { RoomType } from '../../../src/room-types/entities/room-type.entity.js';
import type { User } from '../../../src/users/entities/user.entity.js';
import type { INestApplication } from '@nestjs/common';

export interface BookingRequestAttributes {
  user: User;
  roomType: RoomType;
  checkInDate: string;
  checkOutDate: string;
  roomsRequested?: number;
  status?: BookingRequestStatus;
  expiresAt?: Date;
}

// Inserts a hold directly, bypassing the endpoint's date and capacity rules,
// so a spec can set up any occupancy — including overdue pending holds.
export async function createBookingRequest(
  app: INestApplication,
  attributes: BookingRequestAttributes,
): Promise<BookingRequest> {
  const bookingRequests = app.get(DataSource).getRepository(BookingRequest);

  return bookingRequests.save(
    bookingRequests.create({
      userId: attributes.user.id,
      roomTypeId: attributes.roomType.id,
      roomsRequested: attributes.roomsRequested ?? 1,
      checkInDate: attributes.checkInDate,
      checkOutDate: attributes.checkOutDate,
      totalAmount: '0',
      status: attributes.status ?? 'pending',
      expiresAt:
        attributes.expiresAt ??
        new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000),
    }),
  );
}
