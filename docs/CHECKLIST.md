# Implementation checklist

## Jobs board + swipe nav (owner request, 2026-11-16) — DONE (local, not pushed)
- [x] Jobs backend: `JobPosting` model + migration `20261116085142_job_postings`, `jobs` module (search/get/reveal-phone/CRUD/status), contract in api-client, DTOs, validation. Verified end to end against Neon. 31/31 existing tests still pass.
- [~] Mobile swipe navigation: attempted with material-top-tabs pager; it would not register with expo-router (broke the app), so REVERTED. Tabs are tap-only (owner decision 2026-11-16). Swipe deferred to a different approach if revisited.
- [x] Mobile jobs UI: `app/jobs.tsx` (browse/search), `app/job/[id].tsx` (detail + phone reveal), `app/my-jobs.tsx` (provider manager), `app/job/edit.tsx` (post/edit). Entry points on customer home + provider dashboard.
- [ ] UI "de-AI-ify" / humanization pass across web + mobile — NOT started (large, subjective; separate task).
- Note: all typechecks pass (9/9). Nothing pushed or deployed per owner instruction (local only).

## IN PROGRESS: directory/mediator pivot (owner request, 2026-11-14) — resume here
Customers only browse, compare, save, chat in-app, reveal phone (with Copy) and review. NO booking requests.
- [x] domain: `presence.ts` (AVAILABLE/BUSY/AWAY + message + until auto-return, pause = hidden, freshness, auto-reply), `canReviewProvider` (provider replied in a chat, once). booking.ts REMOVED. 16/16 tests pass.
- [ ] contract (packages/types, validation, api-client): remove Booking*/enquiries/bookings/quotes/admin bookings and disputes; ProviderCard gets status, statusMessage, statusUntil, statusUpdatedAt, availableNow, plus a label; add conversations.{start(providerId,msg), list, get, messages, send, markRead}; providers.revealPhone(id) → {phone} (login required, logs a ContactEvent, respects showPhone); providers.me: setStatus({status,message,until}), setVisibility(visible), insights(days) (views, impressions, chats, phone reveals, saves), quickReplies get/set, contactSettings {showPhone, autoReplyEnabled}; reviews.create({providerId,...ratings}) + reviews.eligibility(providerId); users.recentlyViewed; support uses providerId instead of bookingId; RealtimeEvent: message.created {conversationId}, drop booking.updated; Report target CONVERSATION instead of BOOKING.
- [ ] API: schema (ProviderProfile presenceStatus/statusMessage/statusUntil/statusUpdatedAt/isPaused/showPhone/autoReply/quickReplies; Conversation (unique customer+provider) replaces Enquiry/Booking/BookingEvent; Message.conversationId; Review unique (authorId, providerId); ContactEvent), regenerate migrations (dev DB only, safe to reset), discovery excludes paused, auto-reply once per status period, daily "Are you available today?" job, update tests.
- [ ] Mobile/web: customer tabs Home·Explore·Messages·Saved·Profile; profile CTA "Chat" + "Show phone"; status pill + message + "Updated 2h ago" on cards/profile; provider tabs Dashboard (status card + Show-profile toggle at top)·Messages·Insights·Profile·Settings; quick replies in chat; remove booking screens.
- [ ] Admin: remove bookings/disputes module; providers list shows status/paused.


_Last updated 2026-11-14. Read this first when resuming._

## Status
- [x] Planning, proposal, decisions (docs/PROPOSAL.md, docs/DECISIONS.md)
- [x] Design canvas (design system + 4 customer screens), brand "help" (packages/ui-tokens/src/brand.ts)
- [x] Shared packages: domain (15 tests passing), validation, types, api-client (= API contract), ui-tokens
- [x] Prisma schema (infrastructure/database/schema.prisma)
- [x] apps/admin: all PRD §19 modules + support desk + forgot/reset/change password; typecheck + build pass
- [x] apps/mobile: customer + provider modes, onboarding, notifications (realtime, banner, centre, push deep links), email OTP + recovery, support, compare, quotes, receipts; `tsc --noEmit` passes. NO Expo build run (owner: plan device builds later)
- [x] apps/web: SSR public pages, customer + provider areas, notifications, auth, support, compare; typecheck + build pass
- [x] services/api: every api-client route implemented, plus realtime SSE (LISTEN/NOTIFY), email OTP, admin reset, support desk, branded emails, 6 pg-boss jobs, seed. Typecheck + build pass; 27 tests pass against plain Postgres 17. Migrations are generated in infrastructure/database/migrations but the PostGIS path is UNTESTED (Docker never started). Tests need TEST_DATABASE_URL.

## Integration pass results (2026-11-14)
- `pnpm typecheck`: 9/9 packages, 0 errors. `pnpm build`: api, web, admin succeed (mobile intentionally not built).
- `pnpm test`: domain 15/15 pass; API 27 tests SKIPPED because there was no database (Docker daemon not responding).
- Done: SUPPORT upload purpose (contract + API + mobile + web); message order documented (newest first).
- Remaining: start Docker Desktop, then run step 3 below; admin support links to detail pages; admin column names vs real API.

## Running locally (no Docker needed)
- DB: `node infrastructure/devdb/start.mjs` (project-local Postgres 17, port 54329; ports 5432/5433 are used by system Postgres). PostGIS is not available locally → discovery uses the haversine fallback; migrations skip PostGIS objects when the extension is missing.
- 27/27 API tests PASS against it (`TEST_DATABASE_URL=postgresql://help:help@localhost:54329/help_test`).
- API :4000 (`pnpm --filter @help/api dev`), web :5173, admin :5174, mobile web preview :8081 (`npx expo start --web`; native maps/time picker are shimmed for web only in apps/mobile/shims).
- Known: mobile web preview shows a dev-only warning "Received false for a non-boolean attribute" (react-native-web prop) — cosmetic.

## Final integration pass (next session)
1. `pnpm install` at root; all apps are on React 19 (Expo SDK 58 decides).
2. `pnpm typecheck` across the repo and fix errors.
3. Start Docker → `pnpm db:up` → `pnpm db:migrate` → `SEED_DEMO=true pnpm db:seed` → `pnpm --filter @help/api test`.
4. Contract fixes:
   - add a `SUPPORT` purpose to `UploadSignSchema` and `media.sign` (mobile/web currently use ENQUIRY for support attachments)
   - confirm `messages.list` returns newest first, with `nextCursor` pointing to older messages (mobile/web assume this)
   - admin support ticket → link to user/booking detail (currently goes to the list pages)
   - admin table column names vs real API fields (admin guesses several names)
5. `pnpm build` across the repo.
6. Update README/docs/API.md, then commit (owner approval needed to commit).

## Later (owner decides)
- `.env` values: Neon, Razorpay, Google client ids, SMTP, Cloudinary, FCM, MSG91
- Expo dev build and device testing (Razorpay and Google sign-in need a dev build)
- Razorpay KYC, SMS DLT registration, store accounts, legal review of policy pages
- Map pins (provider coordinates are private by design; consider approximate pins)
- Hindi/regional language UI

## 2026-11-21 launch fixes
- [x] Final legal text (terms, privacy, refunds, grievance) shared from `@help/domain`; no placeholders left (web + app)
- [x] Public `/delete-account` page (no login), linked in footer and legal pages
- [x] Website jobs board: `/jobs` (search, type filter) and `/jobs/:id` (log in to see number, copy button)
- [x] Admin panel restyled to the brand theme (sidebar, cards, buttons, login)
- [x] Profile photo fix: account photo and professional photo now stay in sync; account photo saves on upload
- [ ] App needs a new build for the legal text and photo auto-save (API part is live)

## 2026-11-23 marketing assets
- [x] `marketing/`: 5:21 explainer, 4 YouTube walkthroughs, 6 reels, 4 Shorts, thumbnails, 10-slide sales deck (see marketing/README.md)
- [x] Pipeline in `marketing/_tools` (local capture, Kokoro TTS, generated music, PIL+ffmpeg, pptxgenjs); claims checked against marketing/BRIEF.md

## Known issues
- Mobile chat and SSE assume the API behaviour noted above; nothing has run against a live API yet
- Admin: Payments totals cover loaded rows only; bundle not code-split
