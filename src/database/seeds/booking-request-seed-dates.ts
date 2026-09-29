import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';

import { UPCOMING_WINDOW_DAYS } from './booking-request-seed.constants.js';

export interface StayDates {
  checkInDate: string;
  checkOutDate: string;
}

// Check-in somewhere in the given calendar month, `monthsAgo` back from
// today (0 = the current month), always leaving at least one night before
// today so the stay has ended. Null when that month has no valid day left
// (only possible for month 0 run on the very first day of the month).
export function pickPastStayDates(
  today: DateTime,
  monthsAgo: number,
  nights: number,
): StayDates | null {
  const monthStart = today.startOf('month').minus({ months: monthsAgo });
  const monthEnd =
    monthsAgo === 0 ? today : monthStart.endOf('month').startOf('day');
  const latestCheckIn = DateTime.min(
    monthEnd,
    today.minus({ days: nights + 1 }),
  )!;
  if (latestCheckIn < monthStart) return null;

  const rangeDays = Math.floor(latestCheckIn.diff(monthStart, 'days').days);
  const checkIn = monthStart.plus({
    days: faker.number.int({ min: 0, max: rangeDays }),
  });
  return {
    checkInDate: checkIn.toISODate()!,
    checkOutDate: checkIn.plus({ days: nights }).toISODate()!,
  };
}

export function pickUpcomingStayDates(
  today: DateTime,
  nights: number,
): StayDates {
  const checkIn = today.plus({
    days: faker.number.int({ min: 1, max: UPCOMING_WINDOW_DAYS }),
  });
  return {
    checkInDate: checkIn.toISODate()!,
    checkOutDate: checkIn.plus({ days: nights }).toISODate()!,
  };
}
