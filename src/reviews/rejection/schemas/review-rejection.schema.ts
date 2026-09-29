import { z } from 'zod';

import { timestampSchema } from '../../../common/api-docs/timestamp.schema.js';
import { REJECTION_REASON_MAX_LENGTH } from '../review-rejection.constants.js';

export const createReviewRejectionBodySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1)
    .max(REJECTION_REASON_MAX_LENGTH)
    .describe('Shown to the guest'),
});

export const reviewRejectionResponseSchema = z.object({
  reviewId: z.number().int(),
  adminUserId: z.number().int(),
  reason: z.string(),
  createdAt: timestampSchema,
});

export type CreateReviewRejectionBody = z.infer<
  typeof createReviewRejectionBodySchema
>;

export type ReviewRejectionResponse = z.infer<
  typeof reviewRejectionResponseSchema
>;
