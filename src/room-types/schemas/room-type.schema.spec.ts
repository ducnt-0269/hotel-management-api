import { DateTime } from 'luxon';

import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';
import { listRoomTypesQuerySchema } from './room-type.schema.js';

const day = (offset: number) =>
  DateTime.now()
    .setZone(HOTEL_TIME_ZONE)
    .plus({ days: offset })
    .toFormat('yyyy-MM-dd');

// The repo's first scalar-or-array query param: these cases are the contract
// for how Express 5's `simple` parser output is normalised.
describe('listRoomTypesQuerySchema', () => {
  const stay = { checkInDate: day(1), checkOutDate: day(3) };
  const parse = (query: Record<string, unknown>) =>
    listRoomTypesQuerySchema.parse({ ...stay, ...query });

  it('defaults page and perPage, and filters on nothing', () => {
    expect(parse({})).toEqual({
      page: 1,
      perPage: 20,
      amenities: [],
      rooms: 1,
      ...stay,
    });
  });

  it('wraps the single-value form in an array', () => {
    expect(parse({ amenities: 'wifi' }).amenities).toEqual(['wifi']);
  });

  it('keeps the repeated form as given', () => {
    expect(parse({ amenities: ['wifi', 'tv'] }).amenities).toEqual([
      'wifi',
      'tv',
    ]);
  });

  it('drops duplicate codes', () => {
    expect(parse({ amenities: ['wifi', 'wifi'] }).amenities).toEqual(['wifi']);
  });

  it('treats an empty value as no filter', () => {
    expect(parse({ amenities: '' }).amenities).toEqual([]);
    expect(parse({ amenities: ['', 'wifi'] }).amenities).toEqual(['wifi']);
  });

  describe('stay dates', () => {
    const issues = (query: Record<string, unknown>) => {
      const result = listRoomTypesQuerySchema.safeParse(query);
      return result.success
        ? []
        : result.error.issues.map((issue) => [issue.path[0], issue.message]);
    };

    it('accepts a stay the booking endpoint would accept', () => {
      expect(issues({ checkInDate: day(1), checkOutDate: day(3) })).toEqual([]);
    });

    it('needs both dates', () => {
      expect(issues({ checkInDate: day(1) })).toEqual([
        ['checkOutDate', 'Invalid input: expected string, received undefined'],
      ]);
      expect(issues({})).toEqual([
        ['checkInDate', 'Invalid input: expected string, received undefined'],
        ['checkOutDate', 'Invalid input: expected string, received undefined'],
      ]);
    });

    it('refuses a check-in today', () => {
      expect(issues({ checkInDate: day(0), checkOutDate: day(2) })).toEqual([
        ['checkInDate', 'Must be tomorrow or later'],
      ]);
    });

    it('refuses a check-out on or before check-in', () => {
      expect(issues({ checkInDate: day(3), checkOutDate: day(3) })).toEqual([
        ['checkOutDate', 'Must be after checkInDate'],
      ]);
    });

    it('refuses a stay over 30 nights', () => {
      expect(issues({ checkInDate: day(1), checkOutDate: day(32) })).toEqual([
        ['checkOutDate', 'Stay cannot exceed 30 nights'],
      ]);
    });

    it('refuses a check-in more than 12 months ahead', () => {
      expect(issues({ checkInDate: day(400), checkOutDate: day(401) })).toEqual(
        [['checkInDate', 'Must be within 12 months']],
      );
    });
  });
});
