import { Amenity } from '../../amenities/entities/amenity.entity.js';

import type { DataSource } from 'typeorm';

// The fixed catalogue. Master data, not demo data.
const AMENITY_CODES = [
  'air_conditioning',
  'wifi',
  'tv',
  'minibar',
  'balcony',
  'bathtub',
  'bed_single',
  'bed_double',
  'bed_twin',
  'bed_king',
  'view_sea',
  'view_city',
  'view_garden',
  'view_none',
] as const;

export async function seedAmenities(dataSource: DataSource): Promise<void> {
  await dataSource
    .getRepository(Amenity)
    .createQueryBuilder()
    .insert()
    .values(AMENITY_CODES.map((code) => ({ code })))
    .orIgnore()
    .execute();

  console.log(`amenities: ${AMENITY_CODES.length} codes ensured`);
}
