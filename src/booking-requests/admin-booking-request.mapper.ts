import {
  bookingRequestResponseColumns,
  toBookingRequestResponse,
} from './booking-request.mapper.js';

import type { Payment } from '../payment-sessions/payment/entities/payment.entity.js';
import type { User } from '../users/entities/user.entity.js';
import type { BookingRequest } from './entities/booking-request.entity.js';
import type { BookingRequestRejection } from './rejection/entities/booking-request-rejection.entity.js';
import type { AdminBookingRequestResponse } from './schemas/admin-booking-request.schema.js';
import type { FindOptionsSelect } from 'typeorm';

// Exactly the columns `toAdminBookingRequestResponse` reads.
export const adminBookingRequestResponseColumns: FindOptionsSelect<BookingRequest> =
  {
    ...bookingRequestResponseColumns,
    user: { id: true, email: true, fullName: true },
  };

export function toAdminBookingRequestResponse(
  bookingRequest: BookingRequest,
  user: User,
  payments: Payment[],
  rejections: BookingRequestRejection[],
): AdminBookingRequestResponse {
  return {
    ...toBookingRequestResponse(
      bookingRequest,
      bookingRequest.roomType,
      payments,
      rejections,
    ),
    user: { id: Number(user.id), email: user.email, fullName: user.fullName },
  };
}
