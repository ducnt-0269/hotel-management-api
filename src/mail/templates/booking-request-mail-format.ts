import { DateTime } from 'luxon';

import { stayNights } from '../../booking-requests/booking-request-dates.js';
import { HOTEL_TIME_ZONE } from '../../booking-requests/booking-request.constants.js';

import type { BookingRequestMailData } from '../../booking-requests/booking-request-mail-data.js';
import type { I18nService } from 'nestjs-i18n';

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
