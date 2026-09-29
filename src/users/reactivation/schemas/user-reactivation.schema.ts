import { z } from 'zod';

import { timestampSchema } from '../../../common/api-docs/timestamp.schema.js';

// Body of a reactivation: the outcome row just recorded.
export const userReactivationResponseSchema = z.object({
  userId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: timestampSchema,
});

export type UserReactivationResponse = z.infer<
  typeof userReactivationResponseSchema
>;
