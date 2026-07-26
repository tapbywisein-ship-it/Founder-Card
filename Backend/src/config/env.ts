import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test', 'staging']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Bcrypt (still used for claim-account password hashing)
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(20).default(12),

  // Resend — transactional emails. Default to an address on our VERIFIED
  // domain (tapbywisein.com) rather than Resend's `onboarding@resend.dev`
  // sandbox sender — sending from the sandbox forces test mode (recipients
  // other than the account owner get a 403), so a missing EMAIL_FROM env var
  // must not silently drop us back into that. Override per-env as needed.
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  // Sending identity — MUST be a Resend-verified domain, so this stays on the
  // tapbywisein.com domain (gmail can't be a verified sender).
  EMAIL_FROM: z.string().default('no-reply@tapbywisein.com'),
  // The single human inbox for everything inbound: support, demo leads, contact.
  SUPPORT_EMAIL: z.string().default('tapbywisein@gmail.com'),

  // Web Push (VAPID). Optional — when unset, browser push silently no-ops.
  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default('mailto:tapbywisein@gmail.com'),

  // Supabase Storage buckets
  SUPABASE_STORAGE_AVATAR_BUCKET: z.string().default('avatars'),
  SUPABASE_STORAGE_COVER_BUCKET: z.string().default('covers'),

  // CORS / Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Rate Limiting
  // 15-minute window, 1000 req cap = ~66 req/min sustained per IP. Plenty for
  // React Query polling (unread counts every 30s, conversations every 15s) +
  // normal app traffic. Auth endpoints have their own tighter limiter.
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  LOG_DIR: z.string().default('logs'),

  // File Uploads
  UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(5),
  UPLOAD_ALLOWED_TYPES: z.string().default('image/jpeg,image/jpg,image/png,image/webp,image/gif'),

  // Bull Queues
  BULL_REDIS_URL: z.string().default('redis://localhost:6379'),

  // Supabase — auth, storage, database
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Razorpay (paid event tickets). Optional — when unset, payment endpoints
  // return 503 and paid events fall back to "payments not configured".
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  // Subscription plan ids (Razorpay Subscriptions → Plans). Empty = plan not sold.
  RZP_PLAN_PRO_MONTHLY: z.string().default(''),
  RZP_PLAN_PRO_YEARLY: z.string().default(''),
  RZP_PLAN_ORG_LITE: z.string().default(''),
  RZP_PLAN_ORG_PRO: z.string().default(''),
  // Master switch for tier enforcement. Off = everything free (today's
  // behavior). Flip to "true" only once paid plans exist and are tested.
  BILLING_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  const errors = parseResult.error.errors
    .map((err) => `  ${err.path.join('.')}: ${err.message}`)
    .join('\n');
  throw new Error(`Environment validation failed:\n${errors}`);
}

export const env = parseResult.data;

export type Env = typeof env;
