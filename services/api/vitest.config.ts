import { defineConfig } from 'vitest/config';

// Tests run against a real Postgres. Point TEST_DATABASE_URL at a disposable DB;
// they skip with a clear message when it is unreachable. Tests never truncate tables.
const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://help:help@localhost:5432/help';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: url,
      DIRECT_URL: url,
      RAZORPAY_WEBHOOK_SECRET: 'whsec_test_secret',
      RAZORPAY_KEY_ID: 'rzp_test_x',
      RAZORPAY_KEY_SECRET: 'rzp_secret_x',
      OTP_PROVIDER: 'console',
      // Never send real email from tests (fake addresses bounce back to the sender inbox).
      SMTP_HOST: '',
      ADMIN_WEB_URL: 'http://localhost:5174',
    },
  },
});
