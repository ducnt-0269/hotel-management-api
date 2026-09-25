import { z } from 'zod';

// Every variable the app reads. Validated once at boot by ConfigModule;
// a missing or malformed value stops the process with a readable error.
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Base of the links the app puts in emails; no frontend exists, so they
  // point back at the API itself.
  APP_BASE_URL: z.string().default('http://localhost:3000'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().default('Hotel Management <no-reply@hotel.local>'),

  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default('1d'),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  // Set only to point the client at stripe-mock; unset means api.stripe.com.
  STRIPE_API_HOST: z.string().optional(),
  STRIPE_API_PORT: z.coerce.number().int().positive().optional(),
  STRIPE_API_PROTOCOL: z.enum(['http', 'https']).optional(),
  // Where Stripe sends the browser after checkout. Only a place to land:
  // the webhook, not this redirect, is what records a payment.
  PAYMENT_SUCCESS_URL: z.url(),
  PAYMENT_CANCEL_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;
