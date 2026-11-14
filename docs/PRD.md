# PRD — condensed reference (v2.0)

Full source of truth: [PRD_source.pdf](PRD_source.pdf). This file is a token-cheap index; read the PDF section only when a detail is needed.

## Product
India-first hyperlocal professional discovery + services marketplace. Providers (electricians, tutors, drivers, photographers…) get a professional profile; customers discover by location/skill/rating/price/availability. Revenue: provider subscriptions (Razorpay), customers free.

## Platforms (one backend, one DB, one account per person)
- Mobile: Expo + RN + TS (Android/iOS). Customer tabs: Home, Explore, Bookings, Saved, Profile. Provider tabs: Dashboard, Enquiries, Bookings, Profile, Settings.
- Web: React + Vite + TS + React Router. SEO public profiles `/professionals/<slug>`.
- Admin: React + Vite + TS, role-based admin permissions.
- API: Node + Express + TS, REST `/api/v1/*`, Zod, modular monolith.
- DB: Neon Postgres + Prisma (+PostGIS if available). Hosting: Render.
- Integrations: Google OAuth + phone OTP, Razorpay Subscriptions, Nodemailer SMTP, Cloudinary, FCM.

## Key rules (PRD §)
- One account = customer + provider roles (§5). Account linking on verified email (§6.1).
- Customer browses without forced onboarding (§6.2). Provider onboarding 8 steps, drafts allowed (§6.3).
- Public profile hides private phone/email/home address (§7, §11, §21.6).
- Discovery filters: distance 1/3/5/10/25/custom km, rating, experience, price, available now, verified, language, online/offline (§8). Ranking hypothesis: relevance 30, distance 20, rating 20, availability 15, completeness/verification 10, responsiveness 5. Sponsored must be labelled.
- Availability timezone-aware; "available now" must not rely on stale settings (§9).
- Engagement types: enquiry, callback, quotation, instant booking, scheduled, project (§10). Explicit booking state machine.
- Reviews: only completed bookings, one per booking, 5 sub-ratings, provider reply, reporting, moderation (§12).
- Verification levels: mobile, identity, qualification, reputation — shown distinctly (§13).
- Subscriptions (§14): draft free; ACTIVE sub required for discoverability + new enquiries. Plans admin-configurable (proposed ₹199/mo, ₹1,999/yr). Statuses INCOMPLETE, PENDING, ACTIVE, PAST_DUE, CANCELLED, EXPIRED, HALTED. 3-day grace, never delete profile/reviews, never auto-cancel confirmed bookings.
- Razorpay (§15): activation only from backend-verified signature/webhook; raw-body HMAC; idempotent event store; reconciliation.
- Notifications via FCM + transactional email templates with retry/dedupe (§18).
- Admin modules (§19): overview, users, providers, categories, verification, subscriptions, payments, bookings, reviews, reports/disputes, promotions, analytics, audit logs.
- Design (§20): navy #172B4D, teal #0D9488, bg #F8FAFC, card #FFF, text #1E293B/#64748B, success #16A34A, warning #F59E0B, Inter, Lucide, radius 12–16, 8px grid.
- Security (§23): DPDP, rate limits, helmet, resource-level authz, audit logs, data deletion, never store card data.
- Phases (§27): 1 Foundation → 2 Profiles → 3 Subscriptions → 4 Discovery → 5 Bookings → 6 Trust → 7 Admin → 8 QA/Launch → 9 Growth. Each phase: build, test, document, owner approval.
- Acceptance criteria: §30 (16 items).
