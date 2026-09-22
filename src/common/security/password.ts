import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// bcrypt silently ignores anything past 72 bytes, so the schemas cap
// passwords there instead of letting two different inputs share a hash.
export const MAX_PASSWORD_BYTES = 72;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
