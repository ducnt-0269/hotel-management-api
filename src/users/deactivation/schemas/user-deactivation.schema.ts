import { z } from 'zod';

import { timestampSchema } from '../../../common/api-docs/timestamp.schema.js';

// Body of a deactivation: the outcome row just recorded.
export const userDeactivationResponseSchema = z.object({
  userId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: timestampSchema,
});

export type UserDeactivationResponse = z.infer<
  typeof userDeactivationResponseSchema
>;
