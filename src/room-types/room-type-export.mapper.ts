import type { RoomType } from './entities/room-type.entity.js';
import type { RoomTypeExportRow } from './room-type-export.interfaces.js';
import type { FindOptionsSelect } from 'typeorm';

// Exactly the columns `toRoomTypeExportRow` reads.
export const roomTypeExportColumns: FindOptionsSelect<RoomType> = {
  id: true,
  name: true,
  description: true,
  pricePerNight: true,
  totalRooms: true,
  updatedAt: true,
  amenityLinks: { id: true, amenity: { id: true, code: true } },
};

// Needs `amenityLinks.amenity` loaded.
export function toRoomTypeExportRow(roomType: RoomType): RoomTypeExportRow {
  return {
    id: Number(roomType.id),
    name: roomType.name,
    description: roomType.description,
    pricePerNight: Number(roomType.pricePerNight),
    totalRooms: roomType.totalRooms,
    amenities: roomType.amenityLinks
      .map(({ amenity }) => amenity.code)
      .sort()
      .join(', '),
    updatedAt: roomType.updatedAt,
  };
}
