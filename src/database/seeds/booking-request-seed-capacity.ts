import { faker } from '@faker-js/faker';

import { stayNightDates } from '../../booking-requests/booking-request-dates.js';
import { MAX_ROOMS_PER_REQUEST } from '../../booking-requests/booking-request.constants.js';
import {
  MAX_PLACEMENT_ATTEMPTS,
  NIGHTS_MAX,
  NIGHTS_MIN,
} from './booking-request-seed.constants.js';

import type { PlacedCandidate } from './booking-request-seed-types.js';

export interface SeedActor {
  id: string;
}

export interface SeedRoomType {
  id: string;
  pricePerNight: string;
  totalRooms: number;
}

// A room type's held rooms on a given night, `roomTypeId|night` keyed, so no
// generated stay (past or upcoming) ever books more rooms than exist —
// mirroring `availableRoomsPerNightByRoomType`, restricted to what actually
// holds a room: approved requests and (for upcoming) still-open pending ones.
export type OccupancyMap = Map<string, number>;

// Tries a handful of random room type/date/room-count combinations until one
// fits the room type's remaining capacity (for a status that holds rooms),
// or returns the first combination tried otherwise.
export function pickCandidate(
  guests: SeedActor[],
  roomTypes: SeedRoomType[],
  occupancy: OccupancyMap,
  holds: boolean,
  pickStayDates: (
    nights: number,
  ) => { checkInDate: string; checkOutDate: string } | null,
): PlacedCandidate | null {
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
    const roomType = faker.helpers.arrayElement(roomTypes);
    const nights = faker.number.int({ min: NIGHTS_MIN, max: NIGHTS_MAX });
    const stayDates = pickStayDates(nights);
    if (!stayDates) continue;
    const { checkInDate, checkOutDate } = stayDates;
    const roomsRequested = faker.number.int({
      min: 1,
      max: Math.min(MAX_ROOMS_PER_REQUEST, roomType.totalRooms),
    });

    if (holds) {
      const nightDates = stayNightDates(checkInDate, checkOutDate);
      if (
        !reserve(
          occupancy,
          roomType.id,
          roomType.totalRooms,
          nightDates,
          roomsRequested,
        )
      ) {
        continue;
      }
    }

    return {
      userId: faker.helpers.arrayElement(guests).id,
      roomTypeId: roomType.id,
      roomsRequested,
      checkInDate,
      checkOutDate,
      totalAmount: String(
        BigInt(roomType.pricePerNight) *
          BigInt(nights) *
          BigInt(roomsRequested),
      ),
    };
  }
  return null;
}

function reserve(
  occupancy: OccupancyMap,
  roomTypeId: string,
  totalRooms: number,
  nights: string[],
  rooms: number,
): boolean {
  for (const night of nights) {
    const held = occupancy.get(`${roomTypeId}|${night}`) ?? 0;
    if (held + rooms > totalRooms) return false;
  }
  for (const night of nights) {
    const key = `${roomTypeId}|${night}`;
    occupancy.set(key, (occupancy.get(key) ?? 0) + rooms);
  }
  return true;
}
