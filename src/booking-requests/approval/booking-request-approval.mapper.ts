import type { BookingRequestApproval } from './entities/booking-request-approval.entity.js';
import type { BookingRequestApprovalResponse } from './schemas/booking-request-approval.schema.js';

export function toBookingRequestApprovalResponse(
  approval: BookingRequestApproval,
): BookingRequestApprovalResponse {
  return {
    bookingRequestId: Number(approval.bookingRequestId),
    adminUserId: Number(approval.adminUserId),
    createdAt: approval.createdAt,
  };
}
