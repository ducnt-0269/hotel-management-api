import { z } from 'zod';

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

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-23T03:00:00.000Z'],
} as const;

// The JSON exactly as it leaves the API; `toReviewResponse` builds it.
export const reviewResponseSchema = z.object({
  id: z.number().int(),
  bookingRequestId: z.number().int(),
  roomTypeId: z.number().int(),
  rating: z.number().int(),
  comment: z.string(),
  status: reviewStatusSchema,
  createdAt: z.date().meta(timestamp),
});

export const reviewListResponseSchema = paginatedSchema(reviewResponseSchema);

export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
