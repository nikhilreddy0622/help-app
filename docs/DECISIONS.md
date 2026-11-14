# Architecture decisions

Owner approved the proposal on 2026-11-14 with the recommended defaults.

| # | Decision | Notes |
|---|---|---|
| D1 | Stack as proposed, plus `packages/domain`, `packages/ui-tokens`, `packages/api-client` (the contract), pg-boss jobs, our own JWT sessions | One backend; no Redis at launch |
| D2 | OTP via a pluggable provider: `console` (dev), `msg91`, `firebase` | Production refuses `console`. MSG91 needs DLT registration |
| D3 | Web stays on Vite, with SSR only for public routes (`/`, `/search`, `/c/:cat/:city`, `/professionals/:slug`) | Express SSR server in apps/web |
| D4 | Google Maps/Geocoding behind `integrations/geocode.ts` | Swappable for Ola/Mappls |
| D5 | Demo seed data uses Bengaluru | Real launch city still to be confirmed |
| D6 | Reviews allowed for 30 days after completion; the customer confirms completion, which auto-confirms after 72 h; requests expire after 48 h; no pro-rata refunds | Refund policy needs legal sign-off |
| D7 | "help" is the working name; bundle id `com.helpapp.mobile` | Rename once the brand is chosen |
| D8 | Accessible colour shades: teal #0F766E and green #15803D for text and buttons | PRD colours kept for icons/accents |
| D9 | Subscriptions become ACTIVE only from a verified webhook or reconciliation; checkout verify only reaches PENDING | PRD §15 |
| D10 | Geo search uses PostGIS on Float lat/lng columns via an expression GiST index | Keeps Prisma types simple |
| D12 | **Directory/mediator pivot (owner, 2026-11-14):** no bookings. Customers browse, compare, save, chat in-app, reveal the phone number (Copy) and review | Booking state machine removed |
| D13 | Provider presence: Available/Busy/Away + message + optional "until" (auto-returns to Available); a "Show my profile" switch pauses the listing; freshness is shown as "Updated Xh ago" plus a daily nudge | `packages/domain/presence.ts` |
| D14 | Reviews require a conversation the provider replied to; one review per customer per provider, labelled "Contacted via help" | Replaces booking-based reviews |
| D11 | Admins are a separate `AdminUser` table with email + password (bcrypt) and 8 h tokens | 2FA for admins planned before launch |
