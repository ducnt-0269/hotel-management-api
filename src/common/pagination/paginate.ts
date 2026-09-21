import type { PaginationQuery } from './pagination.schema.js';

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number };
}

export function paginate<T>(
  data: T[],
  total: number,
  { page, perPage }: PaginationQuery,
): Paginated<T> {
  return { data, meta: { total, page, perPage } };
}

// TypeORM `find({ skip, take })` arguments for a page.
export function toSkipTake({ page, perPage }: PaginationQuery) {
  return { skip: (page - 1) * perPage, take: perPage };
}
