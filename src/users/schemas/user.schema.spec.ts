import { fullNameSchema, passwordSchema } from './user.schema.js';

describe('passwordSchema', () => {
  it('accepts a plain password of at least 8 characters', () => {
    expect(passwordSchema.safeParse('Password123').success).toBe(true);
    expect(passwordSchema.safeParse('short').success).toBe(false);
  });

  // 24 Vietnamese characters are 72 bytes; bcrypt ignores everything past
  // that, so the cap has to count bytes, not characters.
  it('caps on bytes, not characters', () => {
    const seventyTwoBytes = 'ế'.repeat(24);

    expect(Buffer.byteLength(seventyTwoBytes)).toBe(72);
    expect(passwordSchema.safeParse(seventyTwoBytes).success).toBe(true);
    expect(passwordSchema.safeParse(`${seventyTwoBytes}a`).success).toBe(false);
  });
});

describe('fullNameSchema', () => {
  it('accepts the names real people have', () => {
    for (const name of ['Nguyễn Văn An', "O'Brien", 'Trần Thị B.', 'Le-Roy']) {
      expect(fullNameSchema.safeParse(name).success).toBe(true);
    }
  });

  it('refuses markup and control characters', () => {
    for (const name of ['<script>alert(1)</script>', 'An\nVan', '{}']) {
      expect(fullNameSchema.safeParse(name).success).toBe(false);
    }
  });
});
