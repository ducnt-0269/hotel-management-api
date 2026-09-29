import { DateTime } from 'luxon';

import { holdExpiry } from '../../booking-requests/booking-request-dates.js';
import { NO_OUTCOME } from './booking-request-seed-types.js';
import { randomInstantBetween } from './seed-random-time.js';

import type {
  GeneratedBookingRequest,
  PlacedCandidate,
} from './booking-request-seed-types.js';

// An upcoming hold still open: created this run, expiring per the same rule
// `POST /booking-requests` uses.
export function buildUpcomingPending(
  candidate: PlacedCandidate,
  now: Date,
): GeneratedBookingRequest {
  return {
    ...candidate,
    ...NO_OUTCOME,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt: holdExpiry(now, candidate.checkInDate),
  };
}

// An upcoming stay already approved before this run: created and approved a
// few days ago, well before its still-future check-in.
export function buildUpcomingApproved(
  candidate: PlacedCandidate,
  adminUserId: string,
  now: Date,
  leadDays: number,
): GeneratedBookingRequest {
  const createdAt = DateTime.fromJSDate(now)
    .minus({ days: leadDays })
    .toJSDate();
  const expiresAt = holdExpiry(createdAt, candidate.checkInDate);
  const approvedAt = randomInstantBetween(createdAt, expiresAt);
  return {
    ...candidate,
    ...NO_OUTCOME,
    status: 'approved',
    createdAt,
    updatedAt: approvedAt,
    expiresAt,
    approval: { adminUserId, createdAt: approvedAt },
  };
}
