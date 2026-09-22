import { listRoomTypesQuerySchema } from './room-type.schema.js';

// The repo's first scalar-or-array query param: these cases are the contract
// for how Express 5's `simple` parser output is normalised.
describe('listRoomTypesQuerySchema', () => {
  const parse = (query: Record<string, unknown>) =>
    listRoomTypesQuerySchema.parse(query);

  it('defaults page and perPage, and filters on nothing', () => {
    expect(parse({})).toEqual({ page: 1, perPage: 20, amenities: [] });
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
});
