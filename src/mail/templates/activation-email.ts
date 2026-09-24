import { ACTIVATION_TOKEN_TTL_HOURS } from '../../auth/activation-token.js';

import type { User } from '../../users/entities/user.entity.js';
import type { ISendMailOptions } from '@nestjs-modules/mailer';
import type { I18nService } from 'nestjs-i18n';

// Subject and plain text are built here; the HTML is rendered from
// `templates/activation.mjml` in the queue worker, which is why the language
// travels in the context as `i18nLang`. The plain-text part is what
// notification previews and spam filters read, so it is written out in full.
export function activationEmail(
  i18n: I18nService,
  lang: string,
  user: User,
  activationUrl: string,
): ISendMailOptions {
  const args = {
    fullName: user.fullName,
    expiryHours: ACTIVATION_TOKEN_TTL_HOURS,
  };
  const t = (key: string) => i18n.t(`mail.activation.${key}`, { lang, args });
  const subject = t('subject');

  return {
    subject,
    template: 'activation.mjml',
    context: {
      i18nLang: lang,
      subject,
      preview: t('preview'),
      url: activationUrl,
      ...args,
    },
    text: [
      t('greeting'),
      '',
      t('textBody'),
      activationUrl,
      '',
      t('expiry'),
    ].join('\n'),
  };
}
