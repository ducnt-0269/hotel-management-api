import { stayNights } from './booking-request-dates.js';

import type { Payment } from '../payment-sessions/payment/entities/payment.entity.js';
import type { RoomType } from '../room-types/entities/room-type.entity.js';
import type { BookingRequest } from './entities/booking-request.entity.js';
import type { BookingRequestRejection } from './rejection/entities/booking-request-rejection.entity.js';
import type { BookingRequestResponse } from './schemas/booking-request.schema.js';
import type { FindOptionsSelect } from 'typeorm';

// Exactly the columns `toBookingRequestResponse` reads.
export const bookingRequestResponseColumns: FindOptionsSelect<BookingRequest> =
  {
    id: true,
    roomsRequested: true,
    checkInDate: true,
    checkOutDate: true,
    totalAmount: true,
    status: true,
    expiresAt: true,
    createdAt: true,
    roomType: { id: true, name: true },
  };

// bigint ids and VND amounts arrive from the driver as strings; `Number` is
// exact for them, as they stay far below 2^53. `payments` and `rejections` may
// cover a whole page; only this request's row is used.
export function toBookingRequestResponse(
  bookingRequest: BookingRequest,
  roomType: RoomType,
  payments: Payment[],
  rejections: BookingRequestRejection[],
): BookingRequestResponse {
  const payment = payments.find(
    (row) => row.bookingRequestId === bookingRequest.id,
  );
  const rejection = rejections.find(
    (row) => row.bookingRequestId === bookingRequest.id,
  );
  return {
    id: Number(bookingRequest.id),
    roomType: { id: Number(roomType.id), name: roomType.name },
    roomsRequested: bookingRequest.roomsRequested,
    checkInDate: bookingRequest.checkInDate,
    checkOutDate: bookingRequest.checkOutDate,
    nights: stayNights(bookingRequest.checkInDate, bookingRequest.checkOutDate),
    totalAmount: Number(bookingRequest.totalAmount),
    status: bookingRequest.status,
    expiresAt: bookingRequest.expiresAt,
    createdAt: bookingRequest.createdAt,
    payment: payment
      ? { amount: Number(payment.amount), paidAt: payment.paidAt }
      : null,
    rejection: rejection
      ? { reason: rejection.reason, createdAt: rejection.createdAt }
      : null,
  };
}
