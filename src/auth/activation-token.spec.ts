import {
  ACTIVATION_TOKEN_TTL_HOURS,
  activationTokenExpiry,
  generateActivationToken,
  hashActivationToken,
} from './activation-token.js';

describe('activation token', () => {
  it('generates a fresh 64-character hex token', () => {
    const token = generateActivationToken();

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toBe(generateActivationToken());
  });

  // token_hash is varchar(64); sha256 hex is exactly that wide.
  it('hashes to 64 hex characters, deterministically', () => {
    const hash = hashActivationToken('abc');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashActivationToken('abc')).toBe(hash);
    expect(hashActivationToken('abd')).not.toBe(hash);
  });

  it('expires the configured number of hours after issue', () => {
    const now = new Date('2026-09-22T00:00:00Z');

    expect(activationTokenExpiry(now).toISOString()).toBe(
      new Date(
        now.getTime() + ACTIVATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
      ).toISOString(),
    );
  });
});
