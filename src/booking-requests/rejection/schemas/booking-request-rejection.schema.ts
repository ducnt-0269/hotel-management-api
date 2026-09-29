import { z } from 'zod';

import { timestampSchema } from '../../../common/api-docs/timestamp.schema.js';

export const createBookingRequestRejectionBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).describe('Shown to the guest'),
});

export const bookingRequestRejectionResponseSchema = z.object({
  bookingRequestId: z.number().int(),
  adminUserId: z.number().int(),
  reason: z.string(),
  createdAt: timestampSchema,
});

export type CreateBookingRequestRejectionBody = z.infer<
  typeof createBookingRequestRejectionBodySchema
>;

export type BookingRequestRejectionResponse = z.infer<
  typeof bookingRequestRejectionResponseSchema
>;
