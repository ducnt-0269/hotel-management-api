import { BadRequestException } from '@nestjs/common';
import { In, Raw } from 'typeorm';

import { Amenity } from '../amenities/entities/amenity.entity.js';
import { RoomTypeAmenity } from './entities/room-type-amenity.entity.js';

import type { RoomType } from './entities/room-type.entity.js';
import type { EntityManager, FindOptionsWhere, FindOperator } from 'typeorm';

// The `where` that keeps only room types carrying every code given (AND); no
// codes, no filter. The subquery also works when an unknown code matches none.
export function roomTypesWithAllAmenities(
  codes: string[],
): FindOptionsWhere<RoomType> {
  const id = roomTypeIdWithAllAmenities(codes);
  return id ? { id } : {};
}

// Keep the grouping inside a subquery: `findAndCount` clears GROUP BY on its
// own query, and an ID array would grow with the number of matching rows.
export function roomTypeIdWithAllAmenities(
  codes: string[],
): FindOperator<string> | undefined {
  if (codes.length === 0) return undefined;

  return Raw(
    (alias) =>
      `${alias} IN (
        SELECT link.room_type_id
        FROM room_type_amenities link
        JOIN amenities amenity ON amenity.id = link.amenity_id
        WHERE amenity.code IN (:...amenityCodes)
        GROUP BY link.room_type_id
        HAVING COUNT(DISTINCT amenity.code) = :amenityCount
      )`,
    { amenityCodes: codes, amenityCount: codes.length },
  );
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
