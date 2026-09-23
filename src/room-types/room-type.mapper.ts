import { toAmenityResponse } from '../amenities/amenity.mapper.js';

import type { RoomType } from './entities/room-type.entity.js';
import type { RoomTypeResponse } from './schemas/room-type.schema.js';

// Needs `amenityLinks.amenity` loaded. bigint `id` and `pricePerNight` arrive
// from the driver as strings; they leave as integers. Amenities are sorted:
// the join returns links in whatever order Postgres picks.
export function toRoomTypeResponse(roomType: RoomType): RoomTypeResponse {
  return {
    id: Number(roomType.id),
    name: roomType.name,
    description: roomType.description,
    pricePerNight: Number(roomType.pricePerNight),
    totalRooms: roomType.totalRooms,
    amenities: roomType.amenityLinks
      .map(({ amenity }) => toAmenityResponse(amenity))
      .sort((a, b) => a.code.localeCompare(b.code)),
    createdAt: roomType.createdAt,
    updatedAt: roomType.updatedAt,
  };
}
