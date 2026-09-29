import { z } from 'zod';

import { timestampSchema } from '../../common/api-docs/timestamp.schema.js';

export const createPaymentSessionBodySchema = z.object({
  bookingRequestId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export const paymentSessionResponseSchema = z.object({
  url: z.string(),
  expiresAt: timestampSchema,
});

export type CreatePaymentSessionBody = z.infer<
  typeof createPaymentSessionBodySchema
>;

export type PaymentSessionResponse = z.infer<
  typeof paymentSessionResponseSchema
>;
