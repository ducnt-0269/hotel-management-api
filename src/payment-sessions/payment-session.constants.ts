// Every state a payment session can be in; the DB CHECK lists the same values.
export const PAYMENT_SESSION_STATUSES = [
  'open',
  'completed',
  'expired',
] as const;
