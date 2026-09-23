import { paginationQuerySchema } from './pagination.schema.js';

// The query contract every list endpoint inherits, so it is tested here rather
// than through whichever route happens to use it.
describe('paginationQuerySchema', () => {
  const parse = (query: Record<string, unknown>) =>
    paginationQuerySchema.parse(query);

  it('defaults to the first page', () => {
    expect(parse({})).toEqual({ page: 1, perPage: 20 });
  });

  it('coerces the strings a query string delivers', () => {
    expect(parse({ page: '3', perPage: '50' })).toEqual({
      page: 3,
      perPage: 50,
    });
  });

  it.each([
    ['page below one', { page: '0' }],
    ['a page that is not a number', { page: 'abc' }],
    ['perPage below one', { perPage: '0' }],
    ['perPage above the cap of 100', { perPage: '101' }],
    ['a fractional page', { page: '1.5' }],
  ])('rejects %s', (_label, query) => {
    expect(() => parse(query)).toThrow();
  });
});
