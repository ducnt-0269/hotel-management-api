import { createHash, randomBytes } from 'node:crypto';

export const ACTIVATION_TOKEN_TTL_HOURS = 24;

// The raw token only ever exists in the email; the database stores its
// sha256 hex digest, which is exactly 64 characters.
export function generateActivationToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashActivationToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function activationTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + ACTIVATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}
