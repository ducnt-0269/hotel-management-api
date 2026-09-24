import { z } from 'zod';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-24T03:00:00.000Z'],
} as const;

export const bookingRequestApprovalResponseSchema = z.object({
  bookingRequestId: z.number().int(),
  adminUserId: z.number().int(),
  createdAt: z.date().meta(timestamp),
});

export type BookingRequestApprovalResponse = z.infer<
  typeof bookingRequestApprovalResponseSchema
>;
