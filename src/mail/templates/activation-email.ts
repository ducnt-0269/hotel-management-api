import { ACTIVATION_TOKEN_TTL_HOURS } from '../../auth/activation-token.js';

import type { User } from '../../users/entities/user.entity.js';
import type { ISendMailOptions } from '@nestjs-modules/mailer';

// Subject and plain text live here; the HTML is rendered from
// `templates/activation.mjml` at send time. The plain-text part is what
// notification previews and spam filters read, so it is written by hand.
export function activationEmail(
  user: User,
  activationUrl: string,
): ISendMailOptions {
  const subject = 'Kích hoạt tài khoản Hotel Management';

  return {
    subject,
    template: 'activation.mjml',
    context: {
      subject,
      preview: `Liên kết kích hoạt hết hạn sau ${ACTIVATION_TOKEN_TTL_HOURS} giờ.`,
      fullName: user.fullName,
      url: activationUrl,
      expiryHours: ACTIVATION_TOKEN_TTL_HOURS,
    },
    text: [
      `Xin chào ${user.fullName},`,
      '',
      'Tài khoản của bạn đã được tạo. Mở liên kết sau để kích hoạt:',
      activationUrl,
      '',
      `Liên kết hết hạn sau ${ACTIVATION_TOKEN_TTL_HOURS} giờ.`,
    ].join('\n'),
  };
}
