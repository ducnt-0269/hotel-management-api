import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-22T04:08:46.495Z'],
} as const;

// Body of a deactivation: the outcome row just recorded.
export const userDeactivationResponseSchema = z.object({
  userId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: z.date().meta(timestamp),
});

export type UserDeactivationResponse = z.infer<
  typeof userDeactivationResponseSchema
>;
