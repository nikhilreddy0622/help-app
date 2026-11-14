# help — hyperlocal professional marketplace

A monorepo (pnpm + Turborepo) containing the mobile app, website, admin dashboard and API for an India-first professional discovery marketplace. Product docs: [docs/PRD.md](docs/PRD.md) · [docs/PROPOSAL.md](docs/PROPOSAL.md) · [docs/DECISIONS.md](docs/DECISIONS.md) · [docs/CHECKLIST.md](docs/CHECKLIST.md) · [docs/API.md](docs/API.md)

```
apps/mobile      Expo (Android + iOS), customer + provider modes
apps/web         Vite React website (SSR for public pages)
apps/admin       Vite React admin dashboard
services/api     Express API (modular monolith), Prisma, pg-boss jobs
packages/domain  business rules: booking & subscription state machines, ranking, availability
packages/validation  Zod schemas (API inputs)
packages/types   response DTOs
packages/api-client  typed client = API contract
packages/ui-tokens   design tokens
infrastructure/database  Prisma schema + migrations
```

## Local setup
Requirements: Node 20+, pnpm 10, Docker (for the local PostGIS database).

```bash
pnpm install
```
```bash
pnpm db:up
```
```bash
cp .env.example services/api/.env
```
```bash
pnpm db:migrate
```
```bash
SEED_DEMO=true pnpm db:seed
```
```bash
pnpm dev
```

The API runs on :4000, web on :5173, admin on :5174. For mobile, run `npx expo start` in apps/mobile. Razorpay checkout and Google sign-in on mobile need a dev build: `npx expo run:android`.

In development, OTP codes are printed in the API log (`OTP_PROVIDER=console`).

## Configuration
Every variable is listed in [.env.example](.env.example). Without integration keys the API still runs, and the affected features return `503 NOT_CONFIGURED`.

## Deployment
- API: a Render web service running `pnpm --filter @help/api build && pnpm --filter @help/api db:deploy`, started with `node services/api/dist/server.js`. Health check: `/health`.
- Database: Neon with PostGIS and pg_trgm enabled. Use the pooled URL for `DATABASE_URL` and the direct URL for `DIRECT_URL`.
- Razorpay webhook URL: `https://<api-host>/api/v1/payments/webhooks/razorpay`, events `subscription.*` and `payment.failed`.
