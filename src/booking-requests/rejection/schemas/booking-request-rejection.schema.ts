import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-24T03:00:00.000Z'],
} as const;

export const createBookingRequestRejectionBodySchema = z.object({
  reason: z.string().trim().min(1).max(500).describe('Shown to the guest'),
});

export const bookingRequestRejectionResponseSchema = z.object({
  bookingRequestId: z.number().int(),
  adminUserId: z.number().int(),
  reason: z.string(),
  createdAt: z.date().meta(timestamp),
});

export type CreateBookingRequestRejectionBody = z.infer<
  typeof createBookingRequestRejectionBodySchema
>;

export type BookingRequestRejectionResponse = z.infer<
  typeof bookingRequestRejectionResponseSchema
>;
