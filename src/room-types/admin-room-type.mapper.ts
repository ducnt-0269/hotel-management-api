import { toRoomTypeResponse } from './room-type.mapper.js';

import type { RoomType } from './entities/room-type.entity.js';
import type {
  AdminRoomTypeResponse,
  UpdateRoomTypeBody,
} from './schemas/admin-room-type.schema.js';

// Reads the same columns as `toRoomTypeResponse` (`roomTypeResponseColumns`
// already loads `totalRooms`).
export function toAdminRoomTypeResponse(
  roomType: RoomType,
): AdminRoomTypeResponse {
  return { ...toRoomTypeResponse(roomType), totalRooms: roomType.totalRooms };
}

// The `room_types` columns for the fields an admin sent; fields left out stay
// out. `pricePerNight` goes back to the string the bigint column holds.
export function toRoomTypeColumns({
  pricePerNight,
  ...fields
}: Omit<UpdateRoomTypeBody, 'amenities'>): Partial<
  Pick<RoomType, 'name' | 'description' | 'pricePerNight' | 'totalRooms'>
> {
  return {
    ...fields,
    ...(pricePerNight !== undefined && {
      pricePerNight: String(pricePerNight),
    }),
  };
}
