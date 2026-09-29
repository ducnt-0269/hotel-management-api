import { z } from 'zod';

import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import { reviewResponseSchema, reviewStatusSchema } from './review.schema.js';

// Capped so an absurd id is a 400 here, not a numeric overflow in Postgres.
export const reviewIdParamSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const listReviewsQuerySchema = paginationQuerySchema.extend({
  status: reviewStatusSchema.default('pending'),
});

// The guest's shape plus who left it.
export const adminReviewResponseSchema = reviewResponseSchema.extend({
  user: z.object({
    id: z.number().int(),
    email: z.string(),
    fullName: z.string(),
  }),
});

export const adminReviewListResponseSchema = paginatedSchema(
  adminReviewResponseSchema,
);

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

export type AdminReviewResponse = z.infer<typeof adminReviewResponseSchema>;
