import { z } from 'zod';

import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import {
  MAX_ROOM_TYPE_NAME_LENGTH,
  MAX_TOTAL_ROOMS,
} from '../room-type.constants.js';
import {
  amenityCodesQuerySchema,
  roomTypeResponseSchema,
} from './room-type.schema.js';

export const listAdminRoomTypesQuerySchema = paginationQuerySchema.extend({
  amenities: amenityCodesQuerySchema,
  q: z
    .string()
    .trim()
    .min(1)
    .max(MAX_ROOM_TYPE_NAME_LENGTH)
    .optional()
    .describe('Case-insensitive substring of the name'),
});

// The list's filters without paging: the export takes every matching row.
export const adminRoomTypeFilterSchema = listAdminRoomTypesQuerySchema.omit({
  page: true,
  perPage: true,
});

const amenityCodesBodySchema = z
  .array(z.string())
  .transform((codes) => [...new Set(codes)])
  .describe('Amenity codes; sending the list replaces the whole set');

const roomTypeFields = {
  name: z.string().trim().min(1).max(MAX_ROOM_TYPE_NAME_LENGTH),
  description: z.string().trim().min(1),
  // Integer VND. Capped so the bigint still reads back as an exact number.
  pricePerNight: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  totalRooms: z
    .number()
    .int()
    .min(0)
    .max(MAX_TOTAL_ROOMS)
    .describe('0 stops the type from being booked'),
  amenities: amenityCodesBodySchema,
};

export const createRoomTypeBodySchema = z.object({
  ...roomTypeFields,
  amenities: amenityCodesBodySchema.default([]),
});

// Built from the bare fields, not `createRoomTypeBodySchema.partial()`: the
// create default would otherwise wipe the amenities of every PATCH that
// leaves them out.
export const updateRoomTypeBodySchema = z.object(roomTypeFields).partial();

export const adminRoomTypeResponseSchema = roomTypeResponseSchema.extend({
  totalRooms: z.number().int(),
});

export const adminRoomTypeListResponseSchema = paginatedSchema(
  adminRoomTypeResponseSchema,
);

export type AdminRoomTypeFilter = z.infer<typeof adminRoomTypeFilterSchema>;

export type ListAdminRoomTypesQuery = z.infer<
  typeof listAdminRoomTypesQuerySchema
>;

export type CreateRoomTypeBody = z.infer<typeof createRoomTypeBodySchema>;

export type UpdateRoomTypeBody = z.infer<typeof updateRoomTypeBodySchema>;

export type AdminRoomTypeResponse = z.infer<typeof adminRoomTypeResponseSchema>;
