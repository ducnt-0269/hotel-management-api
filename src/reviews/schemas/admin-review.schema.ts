import { z } from 'zod';

import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import { userSummarySchema } from '../../users/schemas/user.schema.js';
import { reviewResponseSchema, reviewStatusSchema } from './review.schema.js';

// Capped so an absurd id is a 400 here, not a numeric overflow in Postgres.
export const reviewIdParamSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const listReviewsQuerySchema = paginationQuerySchema.extend({
  status: reviewStatusSchema.optional(),
});

// The guest's shape plus who left it.
export const adminReviewResponseSchema = reviewResponseSchema.extend({
  user: userSummarySchema,
});

export const adminReviewListResponseSchema = paginatedSchema(
  adminReviewResponseSchema,
);

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

export type AdminReviewResponse = z.infer<typeof adminReviewResponseSchema>;
