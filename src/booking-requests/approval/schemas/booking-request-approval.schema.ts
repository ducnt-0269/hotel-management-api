import { z } from 'zod';

import { timestampSchema } from '../../../common/api-docs/timestamp.schema.js';

export const bookingRequestApprovalResponseSchema = z.object({
  bookingRequestId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: timestampSchema,
});

export type BookingRequestApprovalResponse = z.infer<
  typeof bookingRequestApprovalResponseSchema
>;
