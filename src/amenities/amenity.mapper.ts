import type { Amenity } from './entities/amenity.entity.js';
import type { AmenityResponse } from './schemas/amenity.schema.js';

// `id` is a bigint the driver hands back as a string; ids leave as integers.
export function toAmenityResponse(amenity: Amenity): AmenityResponse {
  return { id: Number(amenity.id), code: amenity.code };
}
