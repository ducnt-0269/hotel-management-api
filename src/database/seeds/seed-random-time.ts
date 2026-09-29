import { faker } from '@faker-js/faker';
import { DateTime } from 'luxon';

// A moment strictly between `start` and `end`, kept `marginMinutes` clear of
// each edge so it never lands exactly on a boundary a seeded timeline
// depends on. Callers are expected to leave enough room for the margin; the
// fallback only guards against a caller that did not.
export function randomInstantBetween(
  start: Date,
  end: Date,
  marginMinutes = 1,
): Date {
  const from = DateTime.fromJSDate(start).plus({ minutes: marginMinutes });
  const to = DateTime.fromJSDate(end).minus({ minutes: marginMinutes });
  if (to <= from) {
    return DateTime.fromJSDate(start)
      .plus({ minutes: marginMinutes })
      .toJSDate();
  }
  const spanMs = Math.floor(to.diff(from).as('milliseconds'));
  return from
    .plus({ milliseconds: faker.number.int({ min: 0, max: spanMs }) })
    .toJSDate();
}

// A moment up to `maxMinutes` after `base` — used for the expiry sweep,
// which does not run the instant a hold lapses.
export function randomMinutesAfter(base: Date, maxMinutes: number): Date {
  return DateTime.fromJSDate(base)
    .plus({ minutes: faker.number.int({ min: 0, max: maxMinutes }) })
    .toJSDate();
}
