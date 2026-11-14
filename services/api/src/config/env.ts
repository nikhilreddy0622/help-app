import { z } from 'zod';

/**
 * Validated configuration. Integration keys are optional so the API runs
 * locally before credentials exist; each integration reports "not configured"
 * clearly instead of failing silently. Production requires the critical ones.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).default('postgresql://help:help@localhost:5432/help'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
  PUBLIC_WEB_URL: z.string().default('http://localhost:5173'),
  ADMIN_WEB_URL: z.string().default('http://localhost:5174'),
  JWT_ACCESS_SECRET: z.string().min(32).default('dev-access-secret-change-me-0000000000'),
  JWT_REFRESH_SECRET: z.string().min(32).default('dev-refresh-secret-change-me-000000000'),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(60),
  GOOGLE_CLIENT_IDS: z.string().default(''),
  OTP_PROVIDER: z.enum(['console', 'msg91', 'firebase']).default('console'),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SUBSCRIPTION_GRACE_DAYS: z.coerce.number().default(3),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('help <no-reply@example.com>'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  FCM_SERVICE_ACCOUNT_B64: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  RUN_JOBS: z.enum(["true", "false", "1", "0"]).default("true").transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    // Hard requirements: real session secrets and a real mail server (email OTP must never be silently unsafe).
    const required: (keyof Env)[] = ['SMTP_HOST'];
    const missing: string[] = required.filter((k) => !env[k]);
    if (env.JWT_ACCESS_SECRET.startsWith('dev-') || env.JWT_REFRESH_SECRET.startsWith('dev-')) missing.push('JWT_*_SECRET');
    if (missing.length) {
      console.error('Missing production configuration:', missing.join(', '));
      process.exit(1);
    }
    // Soft requirements: fine to launch without these, but each is a real gap until it's set.
    const warnings: string[] = [];
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) warnings.push('Razorpay is not configured — provider subscriptions/payments are disabled until RAZORPAY_* is set.');
    if (env.OTP_PROVIDER === 'console') warnings.push('OTP_PROVIDER=console in production — phone-OTP codes are only written to these server logs (no SMS is sent). Set MSG91/Firebase before relying on phone sign-in for real users. Email OTP is unaffected (it always uses SMTP).');
    if (warnings.length) warnings.forEach((w) => console.warn(`[startup] ${w}`));
  }
  return env;
}

export const env = load();
export const isProd = env.NODE_ENV === 'production';
export const googleClientIds = env.GOOGLE_CLIENT_IDS.split(',').map((s) => s.trim()).filter(Boolean);
