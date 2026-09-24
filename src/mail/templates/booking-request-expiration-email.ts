import {
  bookingRequestDetails,
  bookingRequestSummaryText,
  bookingRequestTranslator,
} from './booking-request-mail-data.js';

import type { BookingRequestMailData } from './booking-request-mail-data.js';
import type { ISendMailOptions } from '@nestjs-modules/mailer';
import type { I18nService } from 'nestjs-i18n';

// Subject and plain text are built here; the HTML is rendered from
// `templates/booking-request-expiration.mjml` in the queue worker, which is why the
// language travels in the context as `i18nLang`.
export function bookingRequestExpirationEmail(
  i18n: I18nService,
  lang: string,
  data: BookingRequestMailData,
): ISendMailOptions {
  const details = bookingRequestDetails(lang, data);
  const t = bookingRequestTranslator(i18n, lang, details);
  const subject = t('subject', { status: t('expiration.status') });

  return {
    subject,
    template: 'booking-request-expiration.mjml',
    context: {
      i18nLang: lang,
      subject,
      preview: t('expiration.body'),
      ...details,
    },
    text: [
      t('greeting'),
      '',
      t('expiration.body'),
      '',
      ...bookingRequestSummaryText(t, details),
      '',
      t('newRequest'),
    ].join('\n'),
  };
}
