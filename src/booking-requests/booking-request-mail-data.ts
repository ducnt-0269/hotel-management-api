import type { BookingRequest } from './entities/booking-request.entity.js';
import type { FindOptionsSelect } from 'typeorm';

// The columns a booking request mail reads; load with
// `relations: { user: true, roomType: true }`.
export const BOOKING_REQUEST_MAIL_SELECT = {
  id: true,
  roomsRequested: true,
  checkInDate: true,
  checkOutDate: true,
  totalAmount: true,
  user: { id: true, email: true, fullName: true },
  roomType: { id: true, name: true },
} satisfies FindOptionsSelect<BookingRequest>;

// What BOOKING_REQUEST_MAIL_SELECT loads.
export type BookingRequestMailData = Pick<
  BookingRequest,
  'id' | 'roomsRequested' | 'checkInDate' | 'checkOutDate' | 'totalAmount'
> & {
  user: Pick<BookingRequest['user'], 'email' | 'fullName'>;
  roomType: Pick<BookingRequest['roomType'], 'name'>;
};
