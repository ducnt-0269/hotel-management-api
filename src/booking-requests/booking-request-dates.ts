import { DateTime } from 'luxon';

export const HOTEL_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function stayNights(checkInDate: string, checkOutDate: string): number {
  const checkIn = DateTime.fromISO(checkInDate, { zone: HOTEL_TIME_ZONE });
  const checkOut = DateTime.fromISO(checkOutDate, { zone: HOTEL_TIME_ZONE });
  return checkOut.diff(checkIn, 'days').days;
}

export function holdExpiry(now: Date, checkInDate: string): Date {
  const checkInStart = DateTime.fromISO(checkInDate, {
    zone: HOTEL_TIME_ZONE,
  }).startOf('day');
  const fullHoldEnd = DateTime.fromJSDate(now).plus({ hours: 24 });
  return DateTime.min(checkInStart, fullHoldEnd)!.toJSDate();
}
