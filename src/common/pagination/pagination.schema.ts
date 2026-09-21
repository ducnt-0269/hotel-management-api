import { z } from 'zod';

// `?page&perPage` query contract for every list endpoint (api-list §1).
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
