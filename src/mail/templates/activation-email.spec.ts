import { createMailRenderer } from '../../../test/support/mail-renderer.js';
import { activationEmail } from './activation-email.js';

import type { MailRenderer } from '../../../test/support/mail-renderer.js';
import type { User } from '../../users/entities/user.entity.js';

const url = 'http://localhost:3000/api/auth/activate?token=abc123';

function userNamed(fullName: string): User {
  return { fullName, email: 'an@example.com' } as User;
}

let i18n: MailRenderer['i18n'];
let render: MailRenderer['render'];

beforeAll(async () => {
  ({ i18n, render } = await createMailRenderer());
});

describe('activationEmail', () => {
  const mail = (lang: string, fullName = 'Nguyễn Văn An') =>
    activationEmail(i18n, lang, userNamed(fullName), url);

  it('carries the link and the expiry in the plain-text part', () => {
    const vi = mail('vi');

    expect(vi.subject).toBe('Kích hoạt tài khoản Hotel Management');
    expect(vi.text).toContain(url);
    expect(vi.text).toContain('Xin chào Nguyễn Văn An,');
    expect(vi.text).toContain('24 giờ');
  });

  it('writes the mail in the language it is given', () => {
    const en = mail('en');

    expect(en.subject).toBe('Activate your Hotel Management account');
    expect(en.text).toContain('Hi Nguyễn Văn An,');
    expect(en.text).toContain('24 hours');
  });

  it('compiles to email-ready HTML with the button and the fallback link', async () => {
    const html = await render(mail('vi'));

    expect(html).toContain('<table');
    // Handlebars escapes `=` to `&#x3D;`, which clients decode back in href.
    expect(html).toContain('auth/activate?token&#x3D;abc123');
    expect(html).toContain('Xin chào Nguyễn Văn An,');
    expect(html).toContain('Kích hoạt tài khoản');
    expect(html).toContain('lang="vi"');
    // MJML's Outlook-only button fallback.
    expect(html).toContain('<!--[if mso');
  });

  it('translates the layout along with the body', async () => {
    const html = await render(mail('en'));

    expect(html).toContain('Activate account');
    expect(html).toContain('If that wasn&#x27;t you');
    expect(html).not.toContain('Kích hoạt');
  });

  it('escapes markup in the name rather than rendering it', async () => {
    const html = await render(
      mail('vi', '</td><a href="https://evil.example">x</a>'),
    );

    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain('&lt;/td&gt;');
  });
});
