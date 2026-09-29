import type { BookingRequestStatus } from '../../booking-requests/entities/booking-request.entity.js';
import type { PAST_STATUS_WEIGHTS } from './booking-request-seed.constants.js';

export type PastOutcomeKind = (typeof PAST_STATUS_WEIGHTS)[number]['value'];

// A room type/date/rooms combination that already cleared the capacity
// check, still missing everything about how the request was resolved.
export interface PlacedCandidate {
  userId: string;
  roomTypeId: string;
  roomsRequested: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
}

// A placed candidate plus its full resolved timeline: the booking request
// row and exactly the outcome row(s) its final status projects.
export interface GeneratedBookingRequest {
  userId: string;
  roomTypeId: string;
  roomsRequested: number;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  status: BookingRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  approval: { adminUserId: string; createdAt: Date } | null;
  rejection: { adminUserId: string; reason: string; createdAt: Date } | null;
  cancellation: { createdAt: Date } | null;
  expiration: { createdAt: Date } | null;
  session: {
    stripeSessionId: string;
    url: string;
    amount: string;
    createdAt: Date;
    expiresAt: Date;
  } | null;
  payment: { amount: string; paidAt: Date; createdAt: Date } | null;
}

// Spread into every builder's return value so each only has to name the
// outcome row(s) its own status actually produces.
export const NO_OUTCOME = {
  approval: null,
  rejection: null,
  cancellation: null,
  expiration: null,
  session: null,
  payment: null,
} as const;
