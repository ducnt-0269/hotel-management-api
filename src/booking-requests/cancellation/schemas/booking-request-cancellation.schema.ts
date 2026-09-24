import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-24T03:00:00.000Z'],
} as const;

// Body of a cancellation: the outcome row just recorded.
export const bookingRequestCancellationResponseSchema = z.object({
  bookingRequestId: z.number().int(),
  createdAt: z.date().meta(timestamp),
});

export type BookingRequestCancellationResponse = z.infer<
  typeof bookingRequestCancellationResponseSchema
>;
