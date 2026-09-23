import { z } from 'zod';

import { MAX_PASSWORD_BYTES } from '../../common/security/password.js';

// bcrypt hashes at most 72 *bytes*: a character cap would let two different
// Vietnamese passphrases share a hash (`ế` alone is 3 bytes).
export const passwordSchema = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value) <= MAX_PASSWORD_BYTES, {
    message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes`,
  });
export const emailSchema = z.email().max(255);
// Letters of any script, combining marks for Vietnamese diacritics, plus the
// punctuation real names carry: Nguyễn Văn An, O'Brien, Trần Thị B.
export const fullNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  // A literal space, not `\s`: that class also matches newlines and tabs.
  .regex(/^[\p{L}\p{M} '’.-]+$/u, 'Full name contains invalid characters');

export const userResponseSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(['user', 'admin']),
  status: z.enum(['unverified', 'active', 'deactivated']),
  createdAt: z.date().meta({
    type: 'string',
    format: 'date-time',
    examples: ['2026-09-22T04:08:46.495Z'],
  }),
});

export const updateProfileBodySchema = z.object({ fullName: fullNameSchema });

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export type UserResponse = z.infer<typeof userResponseSchema>;
