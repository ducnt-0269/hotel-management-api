import { holdExpiry, stayNights } from './booking-request-dates.js';

import type { RoomType } from '../room-types/entities/room-type.entity.js';
import type { User } from '../users/entities/user.entity.js';
import type { BookingRequest } from './entities/booking-request.entity.js';
import type { CreateBookingRequestBody } from './schemas/booking-request.schema.js';

type NewBookingRequest = Pick<
  BookingRequest,
  | 'userId'
  | 'roomTypeId'
  | 'roomsRequested'
  | 'checkInDate'
  | 'checkOutDate'
  | 'totalAmount'
  | 'status'
  | 'expiresAt'
>;

export function newBookingRequest(
  user: User,
  roomType: RoomType,
  body: CreateBookingRequestBody,
  now: Date,
): NewBookingRequest {
  const nights = stayNights(body.checkInDate, body.checkOutDate);

  return {
    userId: user.id,
    roomTypeId: roomType.id,
    roomsRequested: body.roomsRequested,
    checkInDate: body.checkInDate,
    checkOutDate: body.checkOutDate,
    totalAmount: String(
      BigInt(roomType.pricePerNight) *
        BigInt(nights) *
        BigInt(body.roomsRequested),
    ),
    status: 'pending',
    expiresAt: holdExpiry(now, body.checkInDate),
  };
}
