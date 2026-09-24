import { DateTime } from 'luxon';
import { z } from 'zod';

import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import { stayNights } from '../booking-request-dates.js';
import {
  HOTEL_TIME_ZONE,
  MAX_MONTHS_AHEAD,
  MAX_NIGHTS,
  MAX_ROOMS_PER_REQUEST,
} from '../booking-request.constants.js';

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
  // YYYY-MM-DD strings compare correctly as plain strings.
  .superRefine(({ checkInDate, checkOutDate }, ctx) => {
    const today = DateTime.now().setZone(HOTEL_TIME_ZONE);
    const todayDate = today.toFormat('yyyy-MM-dd');
    // Tomorrow at the earliest: a same-day hold would expire at 00:00 of the
    // day it was raised, before anyone could decide on it.
    if (checkInDate <= todayDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['checkInDate'],
        message: 'Must be tomorrow or later',
      });
    } else if (
      checkInDate >
      today.plus({ months: MAX_MONTHS_AHEAD }).toFormat('yyyy-MM-dd')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['checkInDate'],
        message: `Must be within ${MAX_MONTHS_AHEAD} months`,
      });
    }

    const nights = stayNights(checkInDate, checkOutDate);
    if (nights < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['checkOutDate'],
        message: 'Must be after checkInDate',
      });
    } else if (nights > MAX_NIGHTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['checkOutDate'],
        message: `Stay cannot exceed ${MAX_NIGHTS} nights`,
      });
    }
  });

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
