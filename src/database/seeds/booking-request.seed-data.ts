import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';

import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';
import { pickCandidate } from './booking-request-seed-capacity.js';
import {
  pickPastStayDates,
  pickUpcomingStayDates,
} from './booking-request-seed-dates.js';
import {
  buildPastOutcome,
  stripeSessionIdSequence,
} from './booking-request-seed-outcomes.js';
import { buildRequestTimeline } from './booking-request-seed-timeline.js';
import {
  buildUpcomingApproved,
  buildUpcomingPending,
} from './booking-request-seed-upcoming.js';
import {
  FAKER_SEED,
  PAST_REQUEST_COUNT,
  PAST_STATUS_WEIGHTS,
  PAST_WINDOW_MONTHS,
  UPCOMING_APPROVED_COUNT,
  UPCOMING_PENDING_COUNT,
} from './booking-request-seed.constants.js';

import type {
  OccupancyMap,
  SeedActor,
  SeedRoomType,
} from './booking-request-seed-capacity.js';
import type {
  GeneratedBookingRequest,
  PastOutcomeKind,
} from './booking-request-seed-types.js';

export type { GeneratedBookingRequest } from './booking-request-seed-types.js';
export type {
  SeedActor,
  SeedRoomType,
} from './booking-request-seed-capacity.js';

export interface GenerateBookingRequestsParams {
  guests: SeedActor[];
  admin: SeedActor;
  roomTypes: SeedRoomType[];
  now: Date;
}

export function generateBookingRequests({
  guests,
  admin,
  roomTypes,
  now,
}: GenerateBookingRequestsParams): GeneratedBookingRequest[] {
  if (guests.length === 0 || roomTypes.length === 0) return [];

  faker.seed(FAKER_SEED);
  const today = DateTime.fromJSDate(now)
    .setZone(HOTEL_TIME_ZONE)
    .startOf('day');
  const occupancy: OccupancyMap = new Map();
  const nextStripeSessionId = stripeSessionIdSequence();

  const past: GeneratedBookingRequest[] = [];
  let currentMonthPaid = false;
  for (let i = 0; i < PAST_REQUEST_COUNT; i++) {
    const monthsAgo = i % PAST_WINDOW_MONTHS;
    // At least one paid stay lands in the current month, so the month-end
    // revenue query always has something to sum for the month still running.
    const forcePaid = monthsAgo === 0 && !currentMonthPaid;
    const request = generatePastRequest(
      guests,
      admin,
      roomTypes,
      today,
      monthsAgo,
      occupancy,
      nextStripeSessionId,
      forcePaid,
    );
    if (!request) continue;
    past.push(request);
    if (monthsAgo === 0 && request.payment) currentMonthPaid = true;
  }

  const upcoming: GeneratedBookingRequest[] = [];
  for (let i = 0; i < UPCOMING_PENDING_COUNT; i++) {
    const candidate = pickCandidate(
      guests,
      roomTypes,
      occupancy,
      true,
      (nights) => pickUpcomingStayDates(today, nights),
    );
    if (candidate) upcoming.push(buildUpcomingPending(candidate, now));
  }
  for (let i = 0; i < UPCOMING_APPROVED_COUNT; i++) {
    const candidate = pickCandidate(
      guests,
      roomTypes,
      occupancy,
      true,
      (nights) => pickUpcomingStayDates(today, nights),
    );
    if (candidate) {
      // Approved a few days ago: recent enough to still be a "just booked"
      // demo story, old enough to leave room for the approval before now.
      const leadDays = faker.number.int({ min: 2, max: 5 });
      upcoming.push(buildUpcomingApproved(candidate, admin.id, now, leadDays));
    }
  }

  return [...past, ...upcoming];
}

function generatePastRequest(
  guests: SeedActor[],
  admin: SeedActor,
  roomTypes: SeedRoomType[],
  today: DateTime,
  monthsAgo: number,
  occupancy: OccupancyMap,
  nextStripeSessionId: () => string,
  forcePaid: boolean,
): GeneratedBookingRequest | null {
  const kind: PastOutcomeKind = forcePaid
    ? 'approved-paid'
    : faker.helpers.weightedArrayElement(PAST_STATUS_WEIGHTS);
  const holds = kind === 'approved-paid' || kind === 'approved-unpaid';

  const candidate = pickCandidate(
    guests,
    roomTypes,
    occupancy,
    holds,
    (nights) => pickPastStayDates(today, monthsAgo, nights),
  );
  if (!candidate) return null;

  const { createdAt, expiresAt } = buildRequestTimeline(candidate.checkInDate);
  return buildPastOutcome(
    kind,
    candidate,
    admin.id,
    createdAt,
    expiresAt,
    nextStripeSessionId,
  );
}
