import type { PaymentSession } from './entities/payment-session.entity.js';
import type { PaymentSessionResponse } from './schemas/payment-session.schema.js';

export function toPaymentSessionResponse(
  paymentSession: Pick<PaymentSession, 'url' | 'expiresAt'>,
): PaymentSessionResponse {
  return { url: paymentSession.url, expiresAt: paymentSession.expiresAt };
}
