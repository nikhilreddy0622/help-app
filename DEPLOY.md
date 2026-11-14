# Deploying help

Three parts: **API** (Render), **website** + **admin** (Vercel), **mobile app** (Expo/EAS).
The database is already on **Neon (Singapore)**. Nothing here contains secrets — set those in each dashboard.

---

## 0. Before you start — have these ready
- Neon connection strings (pooled = `DATABASE_URL`, direct = `DIRECT_URL`). From the Neon dashboard → Connect.
- Gmail address + app password (SMTP).
- Google OAuth **Web client ID** (you already made this).
- Cloudinary cloud name + API key + **API secret** (the secret you still need to paste).
- Two long random strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (Render can generate these).

---

## 1. API on Render
1. Push this repo to GitHub (done).
2. Render → **New → Blueprint** → pick the repo. Render reads `render.yaml` and creates **help-api** (and optionally **help-web**).
3. On **help-api**, open **Environment** and fill every `sync: false` value:
   - `DATABASE_URL`, `DIRECT_URL` — the Neon Singapore URLs.
   - `CORS_ORIGINS` — your website + admin URLs once you have them, comma-separated
     (e.g. `https://help.vercel.app,https://help-admin.vercel.app`).
   - `PUBLIC_WEB_URL`, `ADMIN_WEB_URL` — same website / admin URLs.
   - `GOOGLE_CLIENT_IDS` — your Google **Web** client ID.
   - `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` — Gmail + app password, e.g. `help <you@gmail.com>`.
   - `CLOUDINARY_*` — cloud name, key, secret (uploads use a local-disk fallback until these are set).
   - `RAZORPAY_*` — leave blank until you test payments (test keys are fine).
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — add these (not in the blueprint) so the admin account seeds.
   - `JWT_*` — leave as "generate" (Render fills them).
4. Deploy. Health check: `https://help-api.onrender.com/health` → `{"ok":true}`.
5. First deploy only — seed demo data once if you want it: Render → help-api → **Shell**:
   `SEED_DEMO=true pnpm --filter @help/api db:seed`

> Render free tier sleeps after inactivity, so the first request after idle is slow. That's the plan, not a bug.

---

## 2. Website on Vercel  (and admin the same way)
The website is a Vite SPA (with SSR available on Render). On Vercel it deploys as a fast static SPA.

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory**: `apps/web`. Vercel detects `apps/web/vercel.json`.
3. **Environment Variables**:
   - `VITE_API_URL` = `https://help-api.onrender.com/api/v1`
   - `VITE_GOOGLE_CLIENT_ID` = your Google Web client ID
4. Deploy. You'll get e.g. `https://help.vercel.app`.
5. Repeat for the **admin**: new project, Root Directory `apps/admin`, same `VITE_API_URL` + `VITE_GOOGLE_CLIENT_ID`.

After both are live, go back to **Render → help-api** and set `CORS_ORIGINS`, `PUBLIC_WEB_URL`, `ADMIN_WEB_URL` to the real Vercel URLs, then redeploy.

> Want server-side rendering for SEO? Deploy **help-web** on Render from the same blueprint instead of Vercel; it keeps SSR. Vercel's static SPA still works for users, just without prerendered HTML for crawlers.

---

## 3. Mobile app (Expo / EAS)
Do this on your machine when you're ready for a device build.
1. `npm i -g eas-cli && eas login`
2. `cd apps/mobile`
3. Set the API URL for the build: in `apps/mobile/.env`
   `EXPO_PUBLIC_API_URL=https://help-api.onrender.com/api/v1`
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your web client id>`
4. `eas build:configure`
5. Android test build (APK): `eas build -p android --profile preview`
6. iOS build (needs an Apple Developer account): `eas build -p ios --profile preview`

Google sign-in on the phone also needs an **Android** OAuth client (package `com.helpapp.mobile` + the build's SHA-1, which EAS prints) and an **iOS** client (bundle `com.helpapp.mobile`). Add those client IDs to `GOOGLE_CLIENT_IDS` on the API.
Maps use free OpenStreetMap, so no Maps key is needed.

---

## 4. Google OAuth — URLs to set after deploy
Google Cloud → **APIs & Services → Credentials → your OAuth Web client**.

**Authorized JavaScript origins** (no paths):
- `http://localhost:5173`  (keep for local dev)
- `http://localhost:5174`
- `https://help.vercel.app`            ← your real website URL
- `https://help-admin.vercel.app`      ← your real admin URL

**Authorized redirect URIs**: leave empty — the site uses Google Identity Services (popup), which needs origins only.

Changes can take 5 minutes to a few hours to apply. If the app is in **Testing** on the OAuth consent screen, add your Google account under **Audience → Test users**.

---

## Quick checklist
- [ ] Render help-api live, `/health` ok, env filled
- [ ] Vercel website live, `VITE_API_URL` set
- [ ] Vercel admin live
- [ ] Render `CORS_ORIGINS` / `PUBLIC_WEB_URL` / `ADMIN_WEB_URL` = real URLs, redeployed
- [ ] Google OAuth origins updated with the real URLs
- [ ] Cloudinary secret set (real uploads) — otherwise local-disk fallback
- [ ] Admin account seeded (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
