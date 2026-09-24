import { stayNights } from './booking-request-dates.js';

import type { RoomType } from '../room-types/entities/room-type.entity.js';
import type { BookingRequest } from './entities/booking-request.entity.js';
import type { BookingRequestResponse } from './schemas/booking-request.schema.js';

// bigint ids and VND amounts arrive from the driver as strings; `Number` is
// exact for them, as they stay far below 2^53.
export function toBookingRequestResponse(
  bookingRequest: BookingRequest,
  roomType: RoomType,
): BookingRequestResponse {
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
  };
}
