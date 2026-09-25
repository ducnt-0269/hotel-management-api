import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MjmlAdapter } from '@nestjs-modules/mailer/adapters/mjml.adapter';

import type { MailerOptions } from '@nestjs-modules/mailer';
import type { I18nService } from 'nestjs-i18n';

const templatesDir = fileURLToPath(new URL('./templates', import.meta.url));

// Handlebars compile options for mail templates and partials; `strict` turns
// a missing context value into an error instead of a blank space in someone's
// inbox. The adapter compiles layout.hbs without them, so a missing
// `i18nLang` there falls back to the default language.
const compileOptions = { strict: true };

// Shared by MailModule and the template specs, so a spec renders exactly what
// the queue worker sends.
export function mailTemplateOptions(
  i18nService: I18nService,
): Pick<MailerOptions, 'template' | 'options'> {
  return {
    // Handlebars fills the MJML source, then MJML compiles it to the table
    // markup Outlook understands. CSS inlining is MJML's job, so the
    // Handlebars adapter's own inliner stays off.
    template: {
      dir: templatesDir,
      // `t` reads src/i18n in the language the context's `i18nLang` names.
      adapter: new MjmlAdapter(
        'handlebars',
        { inlineCssEnabled: false },
        { handlebar: { helper: { t: i18nService.hbsHelper } } },
      ),
      options: compileOptions,
    },
    // Runtime options, read from the top level rather than from `template`:
    // every mail is wrapped in templates/layout.hbs, and templates/partials
    // are available as `{{> name}}`.
    options: {
      layout: 'layout',
      partials: {
        dir: join(templatesDir, 'partials'),
        options: compileOptions,
      },
    },
  };
}
