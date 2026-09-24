import { DateTime } from 'luxon';

import { stayNights } from '../../booking-requests/booking-request-dates.js';
import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';

import type { BookingRequest } from '../../booking-requests/entities/booking-request.entity.js';
import type { I18nService } from 'nestjs-i18n';
import type { FindOptionsSelect } from 'typeorm';

// The columns a booking request mail reads, for the services that load one;
// load with `relations: { user: true, roomType: true }`.
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

export type BookingRequestDetails = ReturnType<typeof bookingRequestDetails>;
export type BookingRequestTranslator = ReturnType<
  typeof bookingRequestTranslator
>;

// The values the templates, the summary partial and the i18n strings
// interpolate, formatted for the mail's language.
export function bookingRequestDetails(
  lang: string,
  data: BookingRequestMailData,
) {
  const longDate = (isoDate: string) =>
    DateTime.fromISO(isoDate, { zone: HOTEL_TIME_ZONE })
      .setLocale(lang)
      .toFormat('cccc, dd/MM/yyyy');

  return {
    id: data.id,
    fullName: data.user.fullName,
    roomTypeName: data.roomType.name,
    checkIn: longDate(data.checkInDate),
    checkOut: longDate(data.checkOutDate),
    nights: stayNights(data.checkInDate, data.checkOutDate),
    rooms: data.roomsRequested,
    total: new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: 'VND',
    }).format(Number(data.totalAmount)),
  };
}

// A translator for `mail.bookingRequest.*` that interpolates the details.
export function bookingRequestTranslator(
  i18n: I18nService,
  lang: string,
  details: BookingRequestDetails,
) {
  return (key: string, extra: object = {}): string =>
    i18n.t(`mail.bookingRequest.${key}`, {
      lang,
      args: { ...details, ...extra },
    });
}

// The plain-text twin of partials/booking-request-summary.hbs.
export function bookingRequestSummaryText(
  t: BookingRequestTranslator,
  details: BookingRequestDetails,
): string[] {
  return [
    `${t('summary.id')}: #${details.id}`,
    `${t('summary.roomType')}: ${details.roomTypeName}`,
    `${t('summary.checkIn')}: ${details.checkIn}`,
    `${t('summary.checkOut')}: ${details.checkOut}`,
    `${t('summary.nights')}: ${details.nights}`,
    `${t('summary.rooms')}: ${details.rooms}`,
    `${t('summary.total')}: ${details.total}`,
  ];
}
