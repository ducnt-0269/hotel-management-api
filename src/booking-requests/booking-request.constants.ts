// Booking policy: numbers the business may change, kept in the app rather
// than in DB constraints.
export const MAX_ROOMS_PER_REQUEST = 5;
export const MAX_NIGHTS = 30;
export const MAX_MONTHS_AHEAD = 12;

// A pending request holds its rooms this long, unless check-in comes first.
export const HOLD_HOURS = 24;

// Every business date (check-in, "today", hold expiry) is a hotel-local date.
export const HOTEL_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const BOOKING_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired',
] as const;
export type BookingRequestStatus = (typeof BOOKING_REQUEST_STATUSES)[number];
