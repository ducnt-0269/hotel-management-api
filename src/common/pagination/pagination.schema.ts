import { z } from 'zod';

// `?page&perPage` query contract for every list endpoint.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// The `{ data, meta }` envelope every list returns. Handed to `@RespondsWith`,
// so it has to survive `z.toJSONSchema`.
export function paginatedSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      total: z.number().int(),
      page: z.number().int(),
      perPage: z.number().int(),
    }),
  });
}
