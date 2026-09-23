import { ConflictException } from '@nestjs/common';

import type { RoomType } from '../room-types/entities/room-type.entity.js';
import type { CreateBookingRequestBody } from './schemas/booking-request.schema.js';
import type { EntityManager } from 'typeorm';

// Nights of the stay where the rooms already held, plus this request, would
// exceed the room type's total. Checked per night, never summed over the
// stay: stays overlap on some nights and not others, so a request can fit the
// stay as a whole and still overflow on a single night. A pending request
// stops holding the moment its hold expires, whether or not the sweep has
// marked it expired yet.
const OVERBOOKED_NIGHTS_SQL = `
  SELECT to_char(stay.night, 'YYYY-MM-DD') AS night
    FROM generate_series($2::date, $3::date - 1, interval '1 day') AS stay(night)
    LEFT JOIN booking_requests held
      ON held.room_type_id = $1
     AND held.status IN ('pending', 'approved')
     AND (held.status = 'approved' OR held.expires_at > now())
     AND held.check_in_date <= stay.night
     AND held.check_out_date > stay.night
   GROUP BY stay.night
  HAVING COALESCE(SUM(held.rooms_requested), 0) + $4 > $5
   ORDER BY stay.night`;

export async function ensureNoOverbookedNight(
  manager: EntityManager,
  roomType: RoomType,
  body: CreateBookingRequestBody,
): Promise<void> {
  const rows: { night: string }[] = await manager.query(OVERBOOKED_NIGHTS_SQL, [
    roomType.id,
    body.checkInDate,
    body.checkOutDate,
    body.roomsRequested,
    roomType.totalRooms,
  ]);
  if (rows.length > 0) {
    throw new ConflictException(
      `Not enough rooms on ${rows.map(({ night }) => night).join(', ')}`,
    );
  }
}
