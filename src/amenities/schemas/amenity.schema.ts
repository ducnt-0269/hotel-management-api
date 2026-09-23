import { z } from 'zod';

import { paginatedSchema } from '../../common/pagination/pagination.schema.js';

// How an amenity appears everywhere: its own endpoint and embedded in a room
// type.
export const amenityResponseSchema = z.object({
  id: z.number().int(),
  code: z.string(),
});

export type AmenityResponse = z.infer<typeof amenityResponseSchema>;

export const amenityListResponseSchema = paginatedSchema(amenityResponseSchema);
