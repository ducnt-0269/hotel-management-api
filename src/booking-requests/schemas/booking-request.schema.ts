import { z } from 'zod';

import { timestampSchema } from '../../common/api-docs/timestamp.schema.js';
import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import {
  BOOKING_REQUEST_STATUSES,
  MAX_ROOMS_PER_REQUEST,
} from '../booking-request.constants.js';
import { refineStayDates } from './stay-dates.schema.js';

export const bookingRequestStatusSchema = z.enum(BOOKING_REQUEST_STATUSES);

// Capped so an absurd id is a 400 here, not a numeric overflow in Postgres.
export const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const bookingRequestIdParamSchema = idSchema;

export const listOwnBookingRequestsQuerySchema = paginationQuerySchema.extend({
  status: bookingRequestStatusSchema.optional(),
  roomTypeId: idSchema.optional(),
});

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
  expiresAt: timestampSchema,
  createdAt: timestampSchema,
  payment: z
    .object({
      amount: z.number().int(),
      paidAt: timestampSchema,
    })
    .nullable()
    .describe('What Stripe took and when; null until the request is paid'),
  rejection: z
    .object({
      reason: z.string(),
      createdAt: timestampSchema,
    })
    .nullable()
    .describe('Why and when an admin refused it; null unless rejected'),
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
