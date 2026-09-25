import { fileURLToPath } from 'node:url';

import { Test } from '@nestjs/testing';
import { I18nModule, I18nService } from 'nestjs-i18n';

import { DEFAULT_LANGUAGE } from '../../src/common/i18n/default-language.js';
import { mailTemplateOptions } from '../../src/mail/mail-template-options.js';

import type { ISendMailOptions, MailerOptions } from '@nestjs-modules/mailer';

const i18nDir = fileURLToPath(new URL('../../src/i18n/', import.meta.url));

export interface MailRenderer {
  i18n: I18nService;
  render: (mail: ISendMailOptions) => Promise<string>;
}

// Renders the real templates through the real adapter and translations, so a
// broken .mjml, a missing key or a missing context value fails in a unit test
// rather than in a queue worker.
export async function createMailRenderer(): Promise<MailRenderer> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      I18nModule.forRoot({
        fallbackLanguage: DEFAULT_LANGUAGE,
        loaderOptions: { path: i18nDir, watch: false },
        logging: false,
      }),
    ],
  }).compile();
  const i18n = moduleRef.get(I18nService);
  const options = mailTemplateOptions(i18n) as MailerOptions;

  return {
    i18n,
    render: (mail) => {
      const envelope = {
        data: { template: mail.template, context: mail.context },
      };
      return new Promise((resolve, reject) => {
        options.template!.adapter!.compile(
          envelope,
          (error?: Error) =>
            error
              ? reject(error)
              : resolve((envelope.data as unknown as { html: string }).html),
          options,
        );
      });
    },
  };
}
