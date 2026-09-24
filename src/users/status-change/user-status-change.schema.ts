import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-22T04:08:46.495Z'],
} as const;

// Body of a deactivation or reactivation: the outcome row just recorded.
export const userStatusChangeResponseSchema = z.object({
  userId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: z.date().meta(timestamp),
});

export type UserStatusChangeResponse = z.infer<
  typeof userStatusChangeResponseSchema
>;
