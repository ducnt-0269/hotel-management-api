import { z } from 'zod';

import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import { MAX_ROOMS_PER_REQUEST } from '../booking-request.constants.js';
import { refineStayDates } from './stay-dates.schema.js';

const bookingRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired',
]);

// Capped so an absurd id is a 400 here, not a numeric overflow in Postgres.
const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const bookingRequestIdParamSchema = idSchema;

export const listOwnBookingRequestsQuerySchema = paginationQuerySchema.extend({
  status: bookingRequestStatusSchema.optional(),
  roomTypeId: idSchema.optional(),
});

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-23T03:00:00.000Z'],
} as const;

export const createBookingRequestBodySchema = z
  .object({
    roomTypeId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    roomsRequested: z.number().int().min(1).max(MAX_ROOMS_PER_REQUEST),
    checkInDate: z.iso.date(),
    checkOutDate: z.iso.date(),
  })
  .superRefine(refineStayDates);

// The JSON exactly as it leaves the API; `toBookingRequestResponse` builds it.
export const bookingRequestResponseSchema = z.object({
  id: z.number().int(),
  roomType: z.object({ id: z.number().int(), name: z.string() }),
  roomsRequested: z.number().int(),
  checkInDate: z.iso.date(),
  checkOutDate: z.iso.date(),
  nights: z.number().int(),
  totalAmount: z.number().int(),
  status: bookingRequestStatusSchema,
  expiresAt: z.date().meta(timestamp),
  createdAt: z.date().meta(timestamp),
});

export const bookingRequestListResponseSchema = paginatedSchema(
  bookingRequestResponseSchema,
);

export type CreateBookingRequestBody = z.infer<
  typeof createBookingRequestBodySchema
>;

export type ListOwnBookingRequestsQuery = z.infer<
  typeof listOwnBookingRequestsQuerySchema
>;

export type BookingRequestResponse = z.infer<
  typeof bookingRequestResponseSchema
>;
