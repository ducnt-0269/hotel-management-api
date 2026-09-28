import { BadRequestException } from '@nestjs/common';
import { In } from 'typeorm';

import { Amenity } from '../amenities/entities/amenity.entity.js';
import { RoomTypeAmenity } from './entities/room-type-amenity.entity.js';

import type { RoomType } from './entities/room-type.entity.js';
import type { EntityManager, FindOptionsWhere } from 'typeorm';

// The `where` that keeps only room types carrying every code given (AND); no
// codes, no filter. The ids come from a query of their own because
// `findAndCount` clears GROUP BY before counting, so a HAVING filter on the
// main query would report a wrong `meta.total`. No match is an empty `IN`,
// which is how an unknown code returns nothing.
export async function roomTypesWithAllAmenities(
  manager: EntityManager,
  codes: string[],
): Promise<FindOptionsWhere<RoomType>> {
  if (codes.length === 0) return {};

  const rows = await manager
    .createQueryBuilder(RoomTypeAmenity, 'link')
    .innerJoin('link.amenity', 'amenity')
    .select('link.roomTypeId', 'id')
    .where('amenity.code IN (:...codes)', { codes })
    .groupBy('link.roomTypeId')
    .having('COUNT(DISTINCT amenity.code) = :required', {
      required: codes.length,
    })
    .getRawMany<{ id: string }>();

  return { id: In(rows.map((row) => row.id)) };
}

// The catalogue rows for the codes an admin sent, or a 400 naming every code
// the catalogue does not hold.
export async function findAmenitiesOrFail(
  manager: EntityManager,
  codes: string[],
): Promise<Amenity[]> {
  if (codes.length === 0) return [];

  const amenities = await manager.find(Amenity, {
    select: { id: true, code: true },
    where: { code: In(codes) },
  });
  const known = new Set(amenities.map((amenity) => amenity.code));
  const unknown = codes.filter((code) => !known.has(code));
  if (unknown.length > 0) {
    throw new BadRequestException(`Unknown amenities: ${unknown.join(', ')}`);
  }
  return amenities;
}

// Links a room type to amenities already looked up.
export async function linkAmenities(
  manager: EntityManager,
  roomTypeId: string,
  amenities: Amenity[],
): Promise<void> {
  if (amenities.length === 0) return;

  await manager.insert(
    RoomTypeAmenity,
    amenities.map((amenity) => ({ roomTypeId, amenityId: amenity.id })),
  );
}
