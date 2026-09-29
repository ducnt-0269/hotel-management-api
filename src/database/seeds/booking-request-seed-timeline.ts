import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';

import { holdExpiry } from '../../booking-requests/booking-request-dates.js';
import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';
import {
  EXPIRATION_SWEEP_MINUTES_MAX,
  LEAD_HOURS_MAX,
  LEAD_HOURS_MIN,
  PAYMENT_START_DELAY_HOURS_MAX,
} from './booking-request-seed.constants.js';
import {
  randomInstantBetween,
  randomMinutesAfter,
} from './seed-random-time.js';

export interface RequestTimeline {
  createdAt: Date; // t0
  expiresAt: Date; // hold expiry the real service would have computed for t0
}

function checkInStartOf(checkInDate: string): DateTime {
  return DateTime.fromISO(checkInDate, { zone: HOTEL_TIME_ZONE }).startOf(
    'day',
  );
}

// Picks how long before check-in the guest raised the request (t0), then
// derives the hold expiry from it with the production `holdExpiry` — so a
// seeded request's window matches one the app would have produced.
export function buildRequestTimeline(checkInDate: string): RequestTimeline {
  const leadHours = faker.number.int({
    min: LEAD_HOURS_MIN,
    max: LEAD_HOURS_MAX,
  });
  const createdAt = checkInStartOf(checkInDate)
    .minus({ hours: leadHours })
    .toJSDate();
  return { createdAt, expiresAt: holdExpiry(createdAt, checkInDate) };
}

// t2: the guest opens Stripe Checkout shortly after approval, always with
// enough room left before check-in for the payment step (t3) that follows.
export function paymentSessionCreatedAt(
  approvedAt: Date,
  checkInDate: string,
): Date {
  const cappedByCheckIn = checkInStartOf(checkInDate).minus({ hours: 1 });
  const cappedByDelay = DateTime.fromJSDate(approvedAt).plus({
    hours: PAYMENT_START_DELAY_HOURS_MAX,
  });
  const latest = DateTime.min(cappedByCheckIn, cappedByDelay)!;
  return randomInstantBetween(approvedAt, latest.toJSDate());
}

// t3: Stripe reports the payment within the session's 24h window and before
// check-in.
export function paymentPaidAt(
  sessionCreatedAt: Date,
  checkInDate: string,
): Date {
  const sessionExpiresAt = DateTime.fromJSDate(sessionCreatedAt).plus({
    hours: 24,
  });
  const latest = DateTime.min(
    sessionExpiresAt,
    checkInStartOf(checkInDate).minus({ minutes: 30 }),
  )!;
  return randomInstantBetween(sessionCreatedAt, latest.toJSDate());
}

// t1 for an expired hold: the sweep only notices up to 30 minutes after the
// hold actually lapsed.
export function expirationOutcomeAt(expiresAt: Date): Date {
  return randomMinutesAfter(expiresAt, EXPIRATION_SWEEP_MINUTES_MAX);
}
