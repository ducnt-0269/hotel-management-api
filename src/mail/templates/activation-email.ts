import escapeHtml from 'escape-html';

import type { User } from '../../users/entities/user.entity.js';

// One inline template while there is exactly one mail. When F-015 adds the
// booking mails, move these to a template adapter — Handlebars escapes on its
// own, which is the job escapeHtml() is doing by hand here.
export function activationEmail(user: User, activationUrl: string) {
  const name = escapeHtml(user.fullName);

  return {
    subject: 'Kích hoạt tài khoản Hotel Management',
    text: `Xin chào ${user.fullName},\n\nMở liên kết sau để kích hoạt tài khoản:\n${activationUrl}\n\nLiên kết hết hạn sau 24 giờ.`,
    html: `<p>Xin chào ${name},</p>
<p>Mở liên kết sau để kích hoạt tài khoản:</p>
<p><a href="${activationUrl}">${activationUrl}</a></p>
<p>Liên kết hết hạn sau 24 giờ.</p>`,
  };
}
