import { createMailRenderer } from '../../../test/support/mail-renderer.js';
import { bookingRequestApprovalEmail } from './booking-request-approval-email.js';
import { bookingRequestExpirationEmail } from './booking-request-expiration-email.js';
import { bookingRequestRejectionEmail } from './booking-request-rejection-email.js';

import type { MailRenderer } from '../../../test/support/mail-renderer.js';
import type { BookingRequestMailData } from './booking-request-mail-data.js';

const data: BookingRequestMailData = {
  id: '128',
  roomsRequested: 2,
  checkInDate: '2026-09-25',
  checkOutDate: '2026-09-27',
  totalAmount: '2400000',
  user: { email: 'an@example.com', fullName: 'Nguyễn Văn An' },
  roomType: { name: 'Deluxe Double' },
};
const reason = 'Khách sạn đóng cửa bảo trì trong những ngày này';

let i18n: MailRenderer['i18n'];
let render: MailRenderer['render'];

beforeAll(async () => {
  ({ i18n, render } = await createMailRenderer());
});

describe('booking request emails', () => {
  const mails = (lang: string) => ({
    approval: bookingRequestApprovalEmail(i18n, lang, data),
    rejection: bookingRequestRejectionEmail(i18n, lang, data, reason),
    expiration: bookingRequestExpirationEmail(i18n, lang, data),
  });

  it.each([
    ['approval', 'đã được duyệt'],
    ['rejection', 'bị từ chối'],
    ['expiration', 'đã hết hạn'],
  ] as const)(
    'puts the %s outcome and the stay in the subject and text',
    (outcome, status) => {
      const mail = mails('vi')[outcome];

      expect(mail.subject).toBe(`Yêu cầu đặt phòng #128 ${status}`);
      expect(mail.text).toContain('Xin chào Nguyễn Văn An,');
      expect(mail.text).toContain('Loại phòng: Deluxe Double');
      expect(mail.text).toContain('Nhận phòng: Thứ Sáu, 25/09/2026');
      expect(mail.text).toContain('Trả phòng: Chủ Nhật, 27/09/2026');
      expect(mail.text).toContain('Số đêm: 2');
      expect(mail.text).toMatch(/Tổng tiền: 2\.400\.000\s₫/);
    },
  );

  it.each(['approval', 'rejection', 'expiration'] as const)(
    'compiles the %s mail to email-ready HTML with the summary',
    async (outcome) => {
      const html = await render(mails('vi')[outcome]);

      expect(html).toContain('<table');
      expect(html).toContain('Deluxe Double');
      expect(html).toContain('Thứ Sáu, 25/09/2026');
      expect(html).toMatch(/2\.400\.000\s₫/);
    },
  );

  it('shows the pill and the held rooms on an approval', async () => {
    const html = await render(mails('vi').approval);

    expect(html).toContain('Đã duyệt');
    // The class styles are inlined by MJML, not left in a <style> block.
    expect(html).toMatch(
      /class="pill pill-approved" style="[^"]*background-color: ?#dcfce7/,
    );
    expect(html).toContain('giữ 2 phòng Deluxe Double');
    expect(html).not.toContain('Lý do');
  });

  it('shows the reason only on a rejection', async () => {
    const { rejection, expiration } = mails('vi');

    expect(rejection.text).toContain(`Lý do: ${reason}`);
    expect(await render(rejection)).toContain(reason);
    expect(await render(expiration)).not.toContain('Lý do');
  });

  it('writes the mail in the language it is given', async () => {
    const mail = mails('en').rejection;

    expect(mail.subject).toBe('Booking request #128 declined');
    expect(mail.text).toContain('Check-in: Friday, 25/09/2026');
    expect(await render(mail)).toContain('Declined');
  });

  it('escapes markup in the reason and the name rather than rendering it', async () => {
    const evil = '</td><a href="https://evil.example">x</a>';
    const html = await render(
      bookingRequestRejectionEmail(
        i18n,
        'vi',
        { ...data, user: { ...data.user, fullName: evil } },
        evil,
      ),
    );

    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain('&lt;/td&gt;');
  });
});
