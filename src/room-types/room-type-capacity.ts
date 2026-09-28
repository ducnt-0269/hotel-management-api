import { ConflictException } from '@nestjs/common';
import { DateTime } from 'luxon';

import { availableRoomsPerNightByRoomType } from '../booking-requests/booking-request-availability.js';
import {
  HOTEL_TIME_ZONE,
  MAX_MONTHS_AHEAD,
  MAX_NIGHTS,
} from '../booking-requests/booking-request.constants.js';

import type { EntityManager } from 'typeorm';

const DATE_FORMAT = 'yyyy-MM-dd';

// Refuses a room count that rooms already held would overflow on any night
// from tonight on. The window reaches as far as any hold can: a request
// raised today may start MAX_MONTHS_AHEAD out and last MAX_NIGHTS.
export async function ensureNoOverheldNight(
  manager: EntityManager,
  roomTypeId: string,
  totalRooms: number,
): Promise<void> {
  const today = DateTime.now().setZone(HOTEL_TIME_ZONE);
  const nights = (
    await availableRoomsPerNightByRoomType(
      manager,
      [{ id: roomTypeId, totalRooms }],
      today.toFormat(DATE_FORMAT),
      today
        .plus({ months: MAX_MONTHS_AHEAD, days: MAX_NIGHTS })
        .toFormat(DATE_FORMAT),
    )
  ).get(roomTypeId)!;

  const overheldNights = nights
    .filter(({ available }) => available < 0)
    .map(({ night }) => night);
  if (overheldNights.length > 0) {
    throw new ConflictException(
      `Rooms already held exceed ${totalRooms} on ${overheldNights.join(', ')}`,
    );
  }
}
