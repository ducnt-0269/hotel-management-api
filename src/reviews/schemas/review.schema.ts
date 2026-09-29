import { z } from 'zod';

import { timestampSchema } from '../../common/api-docs/timestamp.schema.js';
import { paginatedSchema } from '../../common/pagination/pagination.schema.js';
import {
  COMMENT_MAX_LENGTH,
  RATING_MAX,
  RATING_MIN,
  REVIEW_STATUSES,
} from '../review.constants.js';

export const reviewStatusSchema = z.enum(REVIEW_STATUSES);

export const createReviewBodySchema = z.object({
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  comment: z.string().trim().min(1).max(COMMENT_MAX_LENGTH),
});

// The JSON exactly as it leaves the API; `toReviewResponse` builds it.
export const reviewResponseSchema = z.object({
  id: z.number().int(),
  bookingRequestId: z.number().int(),
  roomTypeId: z.number().int(),
  rating: z.number().int(),
  comment: z.string(),
  status: reviewStatusSchema,
  createdAt: timestampSchema,
  rejection: z
    .object({
      reason: z.string(),
      createdAt: timestampSchema,
    })
    .nullable()
    .describe('Why an admin refused it; null unless rejected'),
});

export const reviewListResponseSchema = paginatedSchema(reviewResponseSchema);

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
