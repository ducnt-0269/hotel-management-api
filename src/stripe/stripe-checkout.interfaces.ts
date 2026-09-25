export interface CheckoutRequest {
  amount: number;
  description: string;
  metadata: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
}
