import { containsText } from '../common/query/find-operators.js';
import { roomTypeIdWithAllAmenities } from './room-type-amenities.js';

import type { RoomType } from './entities/room-type.entity.js';
import type { ListAdminRoomTypesQuery } from './schemas/admin-room-type.schema.js';
import type { FindOptionsWhere } from 'typeorm';

// The admin room type filters in one place, for every route that has to
// return the rows the admin list shows.
export function adminRoomTypeWhere({
  amenities,
  q,
}: Pick<
  ListAdminRoomTypesQuery,
  'amenities' | 'q'
>): FindOptionsWhere<RoomType> {
  const id = roomTypeIdWithAllAmenities(amenities);

  return {
    ...(id && { id }),
    ...(q && { name: containsText(q) }),
  };
}
