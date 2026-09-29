import { z } from 'zod';

import { timestampSchema } from '../../../common/api-docs/timestamp.schema.js';

export const bookingRequestCancellationResponseSchema = z.object({
  bookingRequestId: z.number().int(),
  createdAt: timestampSchema,
});

export type BookingRequestCancellationResponse = z.infer<
  typeof bookingRequestCancellationResponseSchema
>;
