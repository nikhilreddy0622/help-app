# CLAUDE.md — project instructions

Hyperlocal professional marketplace (India). Read `docs/PRD.md` (condensed) first; open `docs/PRD_source.pdf` only for a specific section. Agreed plan and decisions live in `docs/PROPOSAL.md` and `docs/DECISIONS.md`; progress in `docs/CHECKLIST.md`.

## Working rules
- Work one phase at a time (PRD §27). Finish, test, document, then get owner approval before the next phase.
- Do not change the stack or brand without owner approval.
- Inspect only relevant files; don't re-read unchanged files or dump large files.
- After each task, update `docs/CHECKLIST.md` (done / remaining / known issues).
- Never mark a feature done without running it and its tests.

## Engineering rules
- pnpm + Turborepo monorepo. Shared types/Zod schemas in `packages/*`; never duplicate business rules in apps.
- API: Express modular monolith, `/api/v1`, response envelope `{ data, error, meta }`, Zod on every input, central error handler, pino logs.
- Payments: subscription activation only from verified Razorpay signature/webhook on the backend. Webhooks: raw body HMAC, idempotent by event id.
- Booking and subscription status changes go through their state-machine module only.
- Never expose provider phone/email/exact address in public endpoints.
- Secrets only in env vars; keep `.env.example` current.

## Model usage
- Opus: architecture, schema changes, payments/auth/security code, reviews.
- Sonnet: routine feature work, UI screens, CRUD, tests.
- Haiku: trivial edits, renames, doc touch-ups.
