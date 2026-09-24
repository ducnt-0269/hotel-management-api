import { In, LessThan, MoreThan } from 'typeorm';

import { stayNightDates } from './booking-request-dates.js';
import { BookingRequest } from './entities/booking-request.entity.js';

import type { RoomType } from '../room-types/entities/room-type.entity.js';
import type { EntityManager } from 'typeorm';

type Hold = Pick<
  BookingRequest,
  'roomTypeId' | 'checkInDate' | 'checkOutDate' | 'roomsRequested'
>;

// Rooms still free on each night of the stay, per room type id, from one
// query. Pass the caller's transaction manager to read behind its locks, or
// `dataSource.manager` for a plain read.
export async function availableRoomsPerNightByRoomType(
  manager: EntityManager,
  roomTypes: Pick<RoomType, 'id' | 'totalRooms'>[],
  checkInDate: string,
  checkOutDate: string,
): Promise<Map<string, { night: string; available: number }[]>> {
  // Requests holding rooms on at least one night of the stay. A pending one
  // stops holding once it expires, even before the sweep marks it expired.
  const overlapsStay = {
    roomTypeId: In(roomTypes.map((roomType) => roomType.id)),
    checkInDate: LessThan(checkOutDate),
    checkOutDate: MoreThan(checkInDate),
  };
  const holds: Hold[] = await manager.find(BookingRequest, {
    select: {
      roomTypeId: true,
      checkInDate: true,
      checkOutDate: true,
      roomsRequested: true,
    },
    where: [
      { ...overlapsStay, status: 'approved' },
      { ...overlapsStay, status: 'pending', expiresAt: MoreThan(new Date()) },
    ],
  });

  const nights = stayNightDates(checkInDate, checkOutDate);
  return new Map(
    roomTypes.map((roomType) => {
      const own = holds.filter((hold) => hold.roomTypeId === roomType.id);
      return [
        roomType.id,
        nights.map((night) => ({
          night,
          available: roomType.totalRooms - roomsHeldOn(night, own),
        })),
      ];
    }),
  );
}

function roomsHeldOn(night: string, holds: Hold[]): number {
  return holds
    .filter((hold) => coversNight(hold, night))
    .reduce((sum, hold) => sum + hold.roomsRequested, 0);
}

// The check-out day is not a night of the stay.
function coversNight(hold: Hold, night: string): boolean {
  return hold.checkInDate <= night && night < hold.checkOutDate;
}
