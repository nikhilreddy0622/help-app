# help — marketing brief (source of truth for every asset)

Built from the code (`apps/mobile`, `apps/web`, `services/api`, `packages/*`), not from wishes.
If a claim isn't in this file, it doesn't go in a video or slide.

## What help is
A hyperlocal marketplace for India (live in Bengaluru first; website city pages for Mumbai, Delhi,
Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Kochi). Customers find nearby professionals and
contact them directly. **Free for customers, no commission.** Professionals pay a small subscription
to be listed. Tagline: **"Trusted professionals, right around you."**

## Who uses it
| Role | What they do |
|---|---|
| Customer | Search, compare, chat, see a number, save, review |
| Professional | Build a profile, set status, reply to chats, see insights, post jobs |
| Job seeker | Browse jobs near them, see the employer's number, apply directly |
| Admin team (Super admin, Operations, Support, Finance, Moderator) | Verify pros, moderate reviews and reports, support desk, plans, analytics |

## Real features
**Customers**
- 455 services in 64 groups (electrician, plumber, AC repair, tutors, beauticians, drivers, photographers, carpenters, events…)
- Results sorted by distance from your location; filters: within 10 km, available now, 4★ and up
- Explore with **list or map** view
- Profiles: rating and review count, years of experience, typical reply time, services with prices
  (per visit / per session / starting at), working hours, work photos, approximate service area on a map
- Trust badges: **mobile verified, ID verified, qualified**
- Live status set by the pro: **Available / Busy / Away** with a short note ("On a job, back by 6 PM")
- **In-app chat**; phone number shown to signed-in users with a **Copy** button
- Save professionals; **compare** pros side by side
- **Reviews only from customers who actually chatted** with the pro (stars for quality, behaviour, punctuality, value, communication)
- Report or block; push notifications for new messages
- Sign in with phone, Google or email

**Professionals**
- Get listed in **3–4 short steps**
- Profile editor: name and photo, intro and skills, location and service radius, services and prices, working hours, work photos, verification documents
- Dashboard with one-tap status (Available / Busy / Away + quick notes)
- Messages from customers; insights (profile views, chats started, phone reveals over 7/30/90 days)
- **Post jobs** to hire helpers (full-time, part-time, gig) and manage them (edit, pause, delete)
- Plans: **Pro Monthly ₹199/month**, **Pro Yearly ₹1,999/year** (2 months free). Drafting a profile is free.

**Job seekers**
- "Jobs near you" with search and Full-time / Part-time / Gig filters
- Job page: pay, openings, area, description; see the number and apply directly; **no fees**

**Trust and privacy**
- Exact address and phone are never public; numbers only for signed-in users
- Privacy policy aligned with India's DPDP Act; download your data; **delete your account any time** (in app, website or by email)

**Website** (helpbharath.com): same catalogue, city pages, professional profiles, jobs board, blog, help centre.

## Do NOT claim
- SMS OTP login is not switched on yet (phone codes need MSG91), so don't push "OTP by SMS" as a highlight
- Online payment for subscriptions is wired but Razorpay keys aren't live yet: say "simple plans", never "pay in the app now"
- No "Request now / live booking" (removed), no language picker (English only), no bookings or payments between customer and pro
- No user numbers, ratings counts or city coverage beyond the above

## Brand
| Token | Hex | Use |
|---|---|---|
| Navy | `#13233F` (mark tile `#172B4D`) | headings, dark cards, mark |
| Brand teal | `#0B7A6E` | primary buttons, header |
| Deep teal | `#06574F` | hover, gradients |
| Mark dot | `#0D9488` | the dot in the logo/wordmark |
| Accent yellow | `#FFC21A` | CTA pills, highlights |
| Accent soft | `#FFF4CC` | soft panels |
| Background | `#F4F5F7` | page |
| Ink | `#121722` | body text |

Font: **Inter** (400/500/600/700/800). Wordmark: "help" Inter Bold navy + teal dot.
Mark SVG: navy rounded tile (rx 112/512), white "h" stroke 60, teal dot at (404,372) r32.

## Screens available (`marketing/_src`)
App (1080×1920, local demo data): home, services, category, results, profile, explore (map/list), jobs,
job-detail, welcome, messages, chat, customer-profile, pro-dashboard, pro-profile, pro-messages,
pro-jobs, pro-subscription + scroll clips (home, profile, pro-dashboard).
Website (1920×1200): home, services, city page, for-professionals, blog, delete-account.
