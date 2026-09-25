import { z } from 'zod';

export const createPaymentSessionBodySchema = z.object({
  bookingRequestId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-26T03:00:00.000Z'],
} as const;

export const paymentSessionResponseSchema = z.object({
  url: z.string(),
  expiresAt: z.date().meta(timestamp),
});

export type CreatePaymentSessionBody = z.infer<
  typeof createPaymentSessionBodySchema
>;

export type PaymentSessionResponse = z.infer<
  typeof paymentSessionResponseSchema
>;
