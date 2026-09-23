import { z } from 'zod';

import {
  emailSchema,
  fullNameSchema,
  passwordSchema,
  userResponseSchema,
} from '../../users/schemas/user.schema.js';

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const activateQuerySchema = z.object({ token: z.string().min(1) });

export const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userResponseSchema,
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
