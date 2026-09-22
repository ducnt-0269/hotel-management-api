import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MjmlAdapter } from '@nestjs-modules/mailer/adapters/mjml.adapter';

import { activationEmail } from './activation-email.js';

import type { User } from '../../users/entities/user.entity.js';

const templatesDir = fileURLToPath(new URL('.', import.meta.url));
const url = 'http://localhost:3000/api/auth/activate?token=abc123';

function userNamed(fullName: string): User {
  return { fullName, email: 'an@example.com' } as User;
}

// Renders the real templates through the real adapter, so a broken .mjml or a
// missing context value fails here rather than in a queue worker at runtime.
function render(mail: ReturnType<typeof activationEmail>): Promise<string> {
  const adapter = new MjmlAdapter('handlebars', { inlineCssEnabled: false });
  const envelope = { data: { template: mail.template, context: mail.context } };

  return new Promise((resolve, reject) => {
    adapter.compile(
      envelope,
      (error?: Error) =>
        error
          ? reject(error)
          : resolve((envelope.data as { html: string }).html),
      {
        template: { dir: join(templatesDir), options: { strict: true } },
        options: { layout: 'layout' },
      },
    );
  });
}

describe('activationEmail', () => {
  it('carries the link and the expiry in the plain-text part', () => {
    const mail = activationEmail(userNamed('Nguyễn Văn An'), url);

    expect(mail.subject).toBe('Kích hoạt tài khoản Hotel Management');
    expect(mail.text).toContain(url);
    expect(mail.text).toContain('Nguyễn Văn An');
    expect(mail.text).toContain('24 giờ');
  });

  it('compiles to email-ready HTML with the button and the fallback link', async () => {
    const html = await render(activationEmail(userNamed('Nguyễn Văn An'), url));

    expect(html).toContain('<table');
    // Handlebars escapes `=` to `&#x3D;`, which clients decode back in href.
    expect(html).toContain('auth/activate?token&#x3D;abc123');
    expect(html).toContain('Nguyễn Văn An');
    // MJML's Outlook-only button fallback.
    expect(html).toContain('<!--[if mso');
  });

  it('escapes markup in the name rather than rendering it', async () => {
    const html = await render(
      activationEmail(
        userNamed('</td><a href="https://evil.example">x</a>'),
        url,
      ),
    );

    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain('&lt;/td&gt;');
  });
});
