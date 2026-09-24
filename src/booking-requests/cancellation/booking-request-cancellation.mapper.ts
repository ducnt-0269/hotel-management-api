import type { BookingRequestCancellation } from './entities/booking-request-cancellation.entity.js';
import type { BookingRequestCancellationResponse } from './schemas/booking-request-cancellation.schema.js';

export function toBookingRequestCancellationResponse(
  cancellation: BookingRequestCancellation,
): BookingRequestCancellationResponse {
  return {
    bookingRequestId: Number(cancellation.bookingRequestId),
    createdAt: cancellation.createdAt,
  };
}
