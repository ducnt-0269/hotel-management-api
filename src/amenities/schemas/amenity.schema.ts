import { z } from 'zod';

import { paginatedSchema } from '../../common/pagination/pagination.schema.js';

// How an amenity appears everywhere: its own endpoint and embedded in a room
// type. `id` is a bigint, so it is coerced — ids leave the API as integers.
export const amenityResponseSchema = z.object({
  id: z.coerce.number().int(),
  code: z.string(),
});

export const amenityListResponseSchema = paginatedSchema(amenityResponseSchema);
