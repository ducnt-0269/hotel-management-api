import type { BookingRequestRejection } from './entities/booking-request-rejection.entity.js';
import type { BookingRequestRejectionResponse } from './schemas/booking-request-rejection.schema.js';

export function toBookingRequestRejectionResponse(
  rejection: BookingRequestRejection,
): BookingRequestRejectionResponse {
  return {
    bookingRequestId: Number(rejection.bookingRequestId),
    adminUserId: Number(rejection.adminUserId),
    reason: rejection.reason,
    createdAt: rejection.createdAt,
  };
}
