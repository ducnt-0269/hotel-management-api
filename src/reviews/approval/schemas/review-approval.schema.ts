import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-28T03:00:00.000Z'],
} as const;

export const reviewApprovalResponseSchema = z.object({
  reviewId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: z.date().meta(timestamp),
});

export type ReviewApprovalResponse = z.infer<
  typeof reviewApprovalResponseSchema
>;
