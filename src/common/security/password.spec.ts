import {
  hashPassword,
  MAX_PASSWORD_BYTES,
  verifyPassword,
} from './password.js';

describe('password', () => {
  it('verifies a password against its own hash', async () => {
    const hash = await hashPassword('Password123');

    await expect(verifyPassword('Password123', hash)).resolves.toBe(true);
    await expect(verifyPassword('Password124', hash)).resolves.toBe(false);
  });

  it('hashes the same password differently every time', async () => {
    const [first, second] = await Promise.all([
      hashPassword('Password123'),
      hashPassword('Password123'),
    ]);

    expect(first).not.toBe(second);
  });

  // Why the schemas cap length: bcrypt ignores everything past 72 bytes, so
  // two longer passwords sharing a prefix would share a hash.
  it('cannot tell two passwords apart past the byte cap', async () => {
    const prefix = 'a'.repeat(MAX_PASSWORD_BYTES);
    const hash = await hashPassword(`${prefix}one`);

    await expect(verifyPassword(`${prefix}two`, hash)).resolves.toBe(true);
  });
});
