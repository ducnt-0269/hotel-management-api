import type { BookingRequest } from './entities/booking-request.entity.js';
import type { FindOptionsSelect } from 'typeorm';

// What an outcome mail reads (`BookingRequestMailData`); load with
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
