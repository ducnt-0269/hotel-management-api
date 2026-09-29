import { z } from 'zod';

import { timestampSchema } from '../../../common/api-docs/timestamp.schema.js';

export const reviewApprovalResponseSchema = z.object({
  reviewId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: timestampSchema,
});

export type ReviewApprovalResponse = z.infer<
  typeof reviewApprovalResponseSchema
>;
