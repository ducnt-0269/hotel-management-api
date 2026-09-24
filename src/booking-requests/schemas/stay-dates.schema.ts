import { DateTime } from 'luxon';

import { stayNights } from '../booking-request-dates.js';
import {
  HOTEL_TIME_ZONE,
  MAX_MONTHS_AHEAD,
  MAX_NIGHTS,
} from '../booking-request.constants.js';

import type { z } from 'zod';

// The stays a guest can book: shared by the booking endpoint and the room
// type search, so the search never offers dates a booking would refuse.
// YYYY-MM-DD strings compare correctly as plain strings.
export function refineStayDates(
  { checkInDate, checkOutDate }: { checkInDate: string; checkOutDate: string },
  ctx: z.RefinementCtx,
): void {
  const today = DateTime.now().setZone(HOTEL_TIME_ZONE);
  const todayDate = today.toFormat('yyyy-MM-dd');
  // Tomorrow at the earliest: a same-day hold would expire at 00:00 of the
  // day it was raised, before anyone could decide on it.
  if (checkInDate <= todayDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkInDate'],
      message: 'Must be tomorrow or later',
    });
  } else if (
    checkInDate >
    today.plus({ months: MAX_MONTHS_AHEAD }).toFormat('yyyy-MM-dd')
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkInDate'],
      message: `Must be within ${MAX_MONTHS_AHEAD} months`,
    });
  }

  const nights = stayNights(checkInDate, checkOutDate);
  if (nights < 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkOutDate'],
      message: 'Must be after checkInDate',
    });
  } else if (nights > MAX_NIGHTS) {
    ctx.addIssue({
      code: 'custom',
      path: ['checkOutDate'],
      message: `Stay cannot exceed ${MAX_NIGHTS} nights`,
    });
  }
}
