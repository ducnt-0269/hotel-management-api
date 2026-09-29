import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-28T03:00:00.000Z'],
} as const;

export const createReviewRejectionBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).describe('Shown to the guest'),
});

export const reviewRejectionResponseSchema = z.object({
  reviewId: z.number().int(),
  adminUserId: z.number().int(),
  reason: z.string(),
  createdAt: z.date().meta(timestamp),
});

export type CreateReviewRejectionBody = z.infer<
  typeof createReviewRejectionBodySchema
>;

export type ReviewRejectionResponse = z.infer<
  typeof reviewRejectionResponseSchema
>;
