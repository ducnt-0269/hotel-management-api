import { activationEmail } from './activation-email.js';

import type { User } from '../../users/entities/user.entity.js';

function userWithName(fullName: string): User {
  return { fullName, email: 'an@example.com' } as User;
}

describe('activationEmail', () => {
  const url = 'http://localhost:3000/api/auth/activate?token=abc';

  it('carries the link in both parts', () => {
    const mail = activationEmail(userWithName('Nguyễn Văn An'), url);

    expect(mail.text).toContain(url);
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.html).toContain('Nguyễn Văn An');
  });

  // A name reaches the mail from a public endpoint, so it is untrusted input
  // in an HTML sink — the booking mails will copy this shape to mail admins.
  it('escapes markup in the name instead of rendering it', () => {
    const mail = activationEmail(
      userWithName('</p><a href="https://evil.example">Xác nhận</a><p>'),
      url,
    );

    expect(mail.html).not.toContain('<a href="https://evil.example">');
    expect(mail.html).toContain('&lt;/p&gt;');
  });
});
