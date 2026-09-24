import { DateTime } from 'luxon';

import { HOLD_HOURS, HOTEL_TIME_ZONE } from './booking-request.constants.js';

export function stayNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = DateTime.fromISO(checkInDate, { zone: HOTEL_TIME_ZONE });
  const checkOut = DateTime.fromISO(checkOutDate, { zone: HOTEL_TIME_ZONE });
  return checkOut.diff(checkIn, 'days').days;
}

// Each night of the half-open stay [checkInDate, checkOutDate), as
// YYYY-MM-DD: the check-out day is not a night.
export function stayNightDates(
  checkInDate: string,
  checkOutDate: string,
): string[] {
  const checkIn = DateTime.fromISO(checkInDate, { zone: HOTEL_TIME_ZONE });
  return Array.from({ length: stayNights(checkInDate, checkOutDate) }, (_, i) =>
    checkIn.plus({ days: i }).toISODate()!,
  );
}

export function holdExpiry(now: Date, checkInDate: string): Date {
  const checkInStart = DateTime.fromISO(checkInDate, {
    zone: HOTEL_TIME_ZONE,
  }).startOf('day');
  const fullHoldEnd = DateTime.fromJSDate(now).plus({ hours: HOLD_HOURS });
  return DateTime.min(checkInStart, fullHoldEnd)!.toJSDate();
}
