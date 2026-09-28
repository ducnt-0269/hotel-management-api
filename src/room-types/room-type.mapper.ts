import { toAmenityResponse } from '../amenities/amenity.mapper.js';

import type { RoomType } from './entities/room-type.entity.js';
import type { RoomTypeResponse } from './schemas/room-type.schema.js';
import type { FindOptionsSelect } from 'typeorm';

// The columns `toRoomTypeResponse` reads, plus `totalRooms`: the public search
// needs it for the availability count and the admin response returns it.
// Inventory size stays out of the public response.
export const roomTypeResponseColumns: FindOptionsSelect<RoomType> = {
  id: true,
  name: true,
  description: true,
  pricePerNight: true,
  totalRooms: true,
  createdAt: true,
  updatedAt: true,
  amenityLinks: { id: true, amenity: { id: true, code: true } },
};

// Needs `amenityLinks.amenity` loaded. bigint `id` and `pricePerNight` arrive
// from the driver as strings; they leave as integers. Amenities are sorted:
// the join returns links in whatever order Postgres picks.
export function toRoomTypeResponse(roomType: RoomType): RoomTypeResponse {
  return {
    id: Number(roomType.id),
    name: roomType.name,
    description: roomType.description,
    pricePerNight: Number(roomType.pricePerNight),
    amenities: roomType.amenityLinks
      .map(({ amenity }) => toAmenityResponse(amenity))
      .sort((a, b) => a.code.localeCompare(b.code)),
    createdAt: roomType.createdAt,
    updatedAt: roomType.updatedAt,
  };
}
