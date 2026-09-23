import {
  holdExpiry,
  stayNightDates,
  stayNights,
} from './booking-request-dates.js';

describe('booking request dates', () => {
  describe('stayNights', () => {
    it.each([
      ['2026-10-10', '2026-10-12', 2],
      ['2026-10-31', '2026-11-01', 1],
      ['2026-12-31', '2027-01-30', 30],
      ['2026-10-12', '2026-10-10', -2],
    ])('%s → %s is %i nights', (checkIn, checkOut, nights) => {
      expect(stayNights(checkIn, checkOut)).toBe(nights);
    });
  });

  describe('stayNightDates', () => {
    it('lists each night, leaving out the check-out day', () => {
      expect(stayNightDates('2026-10-30', '2026-11-02')).toEqual([
        '2026-10-30',
        '2026-10-31',
        '2026-11-01',
      ]);
    });
  });

  describe('holdExpiry', () => {
    const now = new Date('2026-09-23T03:00:00Z'); // 10:00 in Saigon

    it('lasts 24 hours when check-in is further away', () => {
      expect(holdExpiry(now, '2026-09-26')).toEqual(
        new Date('2026-09-24T03:00:00Z'),
      );
    });

    it('ends at 00:00 hotel time on check-in day when that comes first', () => {
      expect(holdExpiry(now, '2026-09-24')).toEqual(
        new Date('2026-09-23T17:00:00Z'),
      );
    });

    it('reads check-in day in hotel time, not UTC', () => {
      // 23:30 UTC on the 23rd is already 06:30 on the 24th in Saigon, so a
      // check-in on the 24th has started: the hold ends at its midnight.
      const lateUtc = new Date('2026-09-23T23:30:00Z');
      expect(holdExpiry(lateUtc, '2026-09-24')).toEqual(
        new Date('2026-09-23T17:00:00Z'),
      );
    });
  });
});
