import { z } from 'zod';

import { timestampSchema } from '../../common/api-docs/timestamp.schema.js';
import {
  paginatedSchema,
  paginationQuerySchema,
} from '../../common/pagination/pagination.schema.js';
import { MAX_PASSWORD_BYTES } from '../../common/security/password.js';
import { USER_ROLES, USER_STATUSES } from '../user.constants.js';

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

const userRoleSchema = z.enum(USER_ROLES);
const userStatusSchema = z.enum(USER_STATUSES);

export const userResponseSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  fullName: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  createdAt: timestampSchema,
});

// Who a record belongs to, when the full user would be noise.
export const userSummarySchema = userResponseSchema.pick({
  id: true,
  email: true,
  fullName: true,
});

export const userListResponseSchema = paginatedSchema(userResponseSchema);

export const listUsersQuerySchema = paginationQuerySchema.extend({
  status: userStatusSchema.optional(),
  role: userRoleSchema.optional(),
  q: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .optional()
    .describe('Case-insensitive substring of the email or the full name'),
});

// Capped so an absurd id is a 400 here, not a numeric overflow in Postgres.
export const userIdParamSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const updateProfileBodySchema = z.object({ fullName: fullNameSchema });

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export type UserResponse = z.infer<typeof userResponseSchema>;
export type UserSummary = z.infer<typeof userSummarySchema>;
