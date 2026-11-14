# help API (services/api)

help is a directory/mediator: customers browse, compare, save, chat in-app, reveal phone and review. There are no bookings, quotes or disputes.

Base URL `/api/v1`. Envelope `{ data, error, meta }`; errors `{ code, message, details }`. Cursor lists return `meta.nextCursor`.
Auth: `Bearer <access token>` (user) or admin token (8h, from `/admin/auth/login`). 404 is returned for resources the caller does not own (no existence leak).
Contract source of truth: `packages/api-client/src/index.ts`. Auth column: `-` public, `opt` optional user, `U` user, `P` user with provider profile, `A:<roles>` admin (SUPER_ADMIN always passes).

## Auth
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /auth/otp/request, /auth/otp/verify | - | Phone OTP sign-in (5 min expiry, 5 attempts, 30 s resend, 5/h) |
| POST | /auth/email/request, /auth/email/verify | - | Email OTP sign-in / recovery path (same limits; code mailed via template `otp-code`) |
| POST | /auth/google | - | Google ID-token sign-in |
| POST | /auth/refresh | - | Rotate refresh token (reuse revokes the family) |
| GET | /auth/me | U | Current user (`emailVerified`, `linked.{google,phone,email}`) |
| POST | /auth/link/phone, /auth/link/google, /auth/link/email | U | Link identity; 409 `IDENTITY_TAKEN` if owned by another account |
| GET/DELETE | /auth/sessions, /auth/sessions/:id | U | Devices; per-device revoke |
| POST | /auth/logout | U | End current session |

## Users
| Method | Path | Auth | Purpose |
|---|---|---|---|
| PATCH | /users/me | U | Update profile |
| POST | /users/me/push-tokens | U | Register FCM token |
| DELETE | /users/me | U | DPDP erasure: anonymise PII, revoke sessions, hide profile |
| GET | /users/me/export | U | JSON export of all user data |
| GET | /users/me/saved; PUT/DELETE /users/me/saved/:providerId | U | Saved professionals |
| GET | /users/me/recent-searches | U | Last 10 searches (stored on signed-in search) |
| GET | /users/me/recently-viewed | U | Last 20 viewed profiles (recorded on signed-in profile fetch) |
| POST/DELETE | /users/:userId/block | U | Block / unblock a user |

## Catalogue, discovery, providers
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /categories | - | Flat list: top-level groups (`parentId` null, ordered by sortOrder) each followed by its subcategories; `providerCount` = discoverable providers (a group sums its children). `categoryId` on search accepts a group and includes its children |
| GET | /discovery/search | opt | PostGIS radius search (haversine fallback without PostGIS), filters, trigram text match, domain ranking, one flagged sponsored slot on page 1; paused providers excluded; `availableNow` uses effective presence; impressions recorded |
| GET | /discovery/home | - | Home feed: categories, availableNow, topRated, recentlyActive |
| GET | /discovery/geocode?pin= | - | PIN to lat/lng (503 `NOT_CONFIGURED` without `GOOGLE_MAPS_API_KEY`) |
| GET | /providers/:slug | opt | Public profile (presence, `phoneAvailable`, never the phone) or `{ redirectTo }`; counts a view and records recently viewed |
| POST | /providers/:providerId/phone | U | Reveal phone (provider must allow `showPhone` and be discoverable; 30/day per user; logged as contact) |
| GET | /providers/:providerId/reviews | - | Visible reviews |
| POST | /providers/:providerId/block | U | Block the provider's account |
| GET/POST/PATCH | /providers/me | U | Own profile (GET returns null if none) / create / edit basics |
| PUT | /providers/me/skills, /providers/me/location | P | Skills; location (also regenerates slug, old slug kept) |
| POST/PATCH/DELETE | /providers/me/services[/:id] | P | Service offerings |
| POST/DELETE | /providers/me/portfolio[/:id] | P | Portfolio |
| GET | /providers/me/preview, /providers/me/dashboard | P | Public preview; dashboard (views, impressions, chats, phone reveals, saves, presence) |
| PUT | /providers/me/status | P | `SetStatusSchema`: AVAILABLE/BUSY/AWAY + message + auto-return `until`; sets `statusUpdatedAt` |
| POST | /providers/me/status/confirm | P | One tap "still available": refreshes `statusUpdatedAt` |
| PUT | /providers/me/visibility | P | `{visible}`: pause/resume profile (paused = not discoverable; subscription, data and reviews kept) |
| GET | /providers/me/insights?days=7\|30\|90 | P | Daily series, totals, response rate/median, top search terms |
| GET/PUT | /providers/me/contact-settings, /providers/me/quick-replies | P | showPhone, auto-reply, quick replies |
| POST | /providers/me/publish, /providers/me/unpublish | P | Publish needs no missing fields (422 `INCOMPLETE_PROFILE`); discoverability also needs an entitled subscription |
| POST | /providers/me/verifications | P | Submit identity/qualification document (PENDING) |
| GET/PUT | /availability/me; POST /availability/me/exceptions; DELETE /availability/me/exceptions/:id | P | Optional working hours (provider timezone) and time off |

## Subscriptions
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /subscriptions/plans | - | Active plans |
| GET | /subscriptions/me, POST /subscriptions/checkout, /verify, /cancel | P | Razorpay checkout; activation only from verified signature/webhook |
| GET | /payments/me | P | Payment history |
| POST | /payments/webhooks/razorpay | HMAC | Raw-body signature, idempotent by event id |

## Conversations and reviews
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /conversations | U | `{providerId, message}`: find-or-create the pair's thread and send. 409 `PROVIDER_UNAVAILABLE` (paused / not discoverable / not entitled), 400 `SELF_CONVERSATION`, 403 `BLOCKED` |
| GET | /conversations?role= | U | Own threads: unread, last message, provider presence, `canReview` |
| GET | /conversations/:id | participant | Detail (others get 404) |
| GET/POST | /conversations/:id/messages | participant | Newest first (cursor pages to older); send (blocks respected; first provider reply sets response stats) |
| POST | /conversations/:id/read | participant | Mark counterpart messages read (emits `conversation.read`) |
| GET | /reviews/eligibility/:providerId | opt | `{canReview, reason?}` (SELF, NO_INTERACTION, ALREADY_REVIEWED, SIGNED_OUT) |
| POST | /reviews, /reviews/:id/reply | U / P | One review per customer per provider, only after the provider replied in chat (409 `REVIEW_NOT_ALLOWED` with `details.reason`); single provider reply |

Busy/Away providers with auto-reply enabled send one automatic message (`auto: true`) per conversation per status period; it never counts as a real reply.

## Notifications and realtime
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /notifications?category=&unreadOnly=&cursor= | U | Collapsed by `groupKey`; `groupCount` = unread in group |
| GET | /notifications/unread-count | U | `{ count, byCategory }` |
| POST | /notifications/:id/read, /read-group `{groupKey}`, /read-all `{category?}` | U | Mark read |
| DELETE | /notifications/:id | U | Delete |
| GET/PUT | /notifications/preferences | U | Per-category push/email + quiet hours (defaults: promotions off; quiet hours off, 22:00-07:00 IST) |
| GET | /notifications/stream | U | SSE (`data: <RealtimeEvent>`; ping every 25 s; max 5 streams/user; exempt from rate limit). Events: `notification.created`, `notification.read`, `message.created`, `conversation.read`, `support.updated`. Fan-out across instances via Postgres `LISTEN/NOTIFY` channel `realtime` |

Push respects preferences and quiet hours unless `important`; PAYMENTS/ACCOUNT emails are always sent. Push data carries `link`, `notificationId`, `category`; Android channel id is the lower-cased category.

## Support, media, reports
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST/GET | /support/tickets | U | Create (emails `ticket-received`) / list own |
| GET | /support/tickets/:id | U (owner) | Detail (marks read) |
| POST | /support/tickets/:id/messages, /close | U (owner) | Reply (reopens WAITING_ON_USER/RESOLVED) / close |
| POST | /media/sign | U | Cloudinary signed upload (VERIFICATION is `authenticated`); 503 if unconfigured |
| POST | /reports | U | Report provider/user/review/message/conversation |

## Admin (`/admin`, every mutation writes an AuditLog)
| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | /admin/auth/login | - | Email + password |
| POST | /admin/auth/forgot, /admin/auth/reset | - | Always-ok reset email (link valid 30 min, single use); reset invalidates earlier tokens |
| GET | /admin/auth/me | any | Current admin |
| POST | /admin/auth/change-password | any | Needs current password; invalidates earlier tokens |
| GET | /admin/overview, /admin/analytics?days= | any | KPIs; daily series, funnel, top categories |
| GET/POST | /admin/users, /admin/users/:id/status | SUPPORT, OPERATIONS | List / suspend-reactivate |
| GET | /admin/providers[/:id]; POST /:id/visibility, /:id/sponsor | OPERATIONS (+SUPPORT, MODERATOR read); sponsor OPERATIONS | Providers |
| GET/POST/PATCH | /admin/categories[/:id] | OPERATIONS | Categories |
| GET, POST /:id/decision | /admin/verifications | OPERATIONS, SUPPORT | Approve/reject (sets identity/qualification verified) |
| GET/POST/PATCH | /admin/plans[/:id] | FINANCE | Plans (re-pricing clears the Razorpay plan mapping) |
| GET, POST /:id/reconcile | /admin/subscriptions | FINANCE, OPERATIONS | Subscriptions |
| GET | /admin/payments | FINANCE | Payments |
| GET, POST /:id/moderate | /admin/reviews | MODERATOR, SUPPORT | Review moderation (recomputes rating) |
| GET, POST /:id/resolve | /admin/reports | MODERATOR, SUPPORT | Reports |
| GET, POST /:id/messages, /:id/status | /admin/support/tickets | SUPPORT, OPERATIONS | Support desk; reply notifies user + email |
| GET | /admin/audit-logs | SUPER_ADMIN | Audit trail |
| GET/POST | /admin/admins | SUPER_ADMIN | Admin accounts |

### Admin list row columns
- users: id, name, email, phone, phoneVerified, status, city, hasProvider, providerId, createdAt
- providers: id, displayName, slug, status, isDiscoverable, hiddenByAdmin, presence, statusMessage, statusUntil, statusUpdatedAt, isPaused, category, city, email, phone, ratingAvg, ratingCount, completeness, verificationLevel, identityVerified, qualificationVerified, sponsoredUntil, createdAt (detail adds headline, bio, subscriptionStatus, planCode, pendingVerifications)
- verifications: id, providerId, providerName, providerSlug, type, status, label, documentUrl, reviewNote, reviewedBy, reviewedAt, createdAt
- subscriptions: id, providerId, providerName, plan, status, razorpaySubscriptionId, currentPeriodEnd, pastDueSince, cancelAtPeriodEnd, createdAt
- payments: id, razorpayPaymentId, providerId, providerName, amountPaise, status, method, failureReason, paidAt, createdAt
- reviews: id, providerId, providerName, authorName, overall, comment, reply, status, createdAt
- reports: id, targetType, targetId, reason, details, status, resolution, reporterId, reporterName, handledBy, createdAt
- audit-logs: id, adminId, adminEmail, action, targetType, targetId, before, after, ip, createdAt
- support tickets: SupportTicketDto + userName, userId

## Jobs (pg-boss)
Hourly subscription sweep; status auto-return every 15 min (expired Busy/Away becomes Available, provider notified, category STATUS); daily 9 AM IST status nudge for providers whose status is older than 24h (push/in-app, link `/provider/status`); renewal reminders (daily, 3 days before period end); email retry (every 10 min, attempts < 5). Failures are logged and never crash the server. `RUN_JOBS=false` disables them.

## Database
Migrations in `infrastructure/database/migrations` (one init migration + conditional PostGIS/trigram/partial-unique indexes). Dev: ``node infrastructure/devdb/start.mjs` (embedded Postgres on :54329) or `docker compose up -d db``, `pnpm --filter @help/api exec prisma migrate dev`, `pnpm --filter @help/api db:seed` (`SEED_DEMO=true` adds ~30 Bengaluru providers). Tests: `TEST_DATABASE_URL=... pnpm --filter @help/api test` (skip with a message if unreachable; never truncate tables).
