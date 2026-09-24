import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-22T04:08:46.495Z'],
} as const;

// Body of a reactivation: the outcome row just recorded.
export const userReactivationResponseSchema = z.object({
  userId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: z.date().meta(timestamp),
});

export type UserReactivationResponse = z.infer<
  typeof userReactivationResponseSchema
>;
