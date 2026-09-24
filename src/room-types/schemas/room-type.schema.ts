import { z } from 'zod';

import { amenityResponseSchema } from '../../amenities/schemas/amenity.schema.js';
import { MAX_ROOMS_PER_REQUEST } from '../../booking-requests/booking-request.constants.js';
import { refineStayDates } from '../../booking-requests/schemas/stay-dates.schema.js';
import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';

const timestamp = {
  type: 'string',
  format: 'date-time',
  examples: ['2026-09-22T04:08:46.495Z'],
} as const;

export const listRoomTypesQuerySchema = paginationQuerySchema
  .extend({
    // Express 5's `simple` parser gives a bare string for one `?amenities=wifi`
    // and an array for the repeated form, so normalise to `string[]`. Empty
    // values drop out, which makes `?amenities=` mean "no filter".
    amenities: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((value) => [
        ...new Set([value ?? []].flat().filter((code) => code !== '')),
      ])
      .describe(
        'Repeat per code. A room type must carry every code given (AND); a code the catalogue does not hold matches nothing.',
      ),
    checkInDate: z.iso.date(),
    checkOutDate: z.iso
      .date()
      .describe('The day the guest leaves; not a night of the stay'),
    rooms: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_ROOMS_PER_REQUEST)
      .default(1)
      .describe(
        'Only room types with at least this many rooms free on every night of the stay',
      ),
  })
  // The same stays the booking endpoint accepts.
  .superRefine(refineStayDates);

// Capped so an absurd id is a 400 here, not a numeric overflow in Postgres.
export const roomTypeIdParamSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const roomTypeResponseSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  pricePerNight: z.number().int(),
  totalRooms: z.number().int(),
  amenities: z.array(amenityResponseSchema),
  createdAt: z.date().meta(timestamp),
  updatedAt: z.date().meta(timestamp),
});

export const roomTypeListResponseSchema = paginatedSchema(
  roomTypeResponseSchema,
);

export type ListRoomTypesQuery = z.infer<typeof listRoomTypesQuerySchema>;

export type RoomTypeResponse = z.infer<typeof roomTypeResponseSchema>;
