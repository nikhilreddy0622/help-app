# Play Store listing — help

Everything to paste into Play Console. Graphics are in this folder.

| Asset | File | Play requirement |
|---|---|---|
| App icon | `icon-512.png` | 512×512 PNG |
| Feature graphic | `feature-graphic-1024x500.png` | 1024×500 PNG/JPG |
| Phone screenshots (8) | `screenshots/01…08-*.png` | 1080×1920, min 2, max 8 |
| Promo video | `promo-video-1080x1920.mp4` | Play takes a **YouTube link** only: upload this to YouTube (Unlisted is fine) and paste the URL. Optional. |

---

## App details

- **App name (30 max):** `help – Local Pros Near You`
- **Package name:** `com.helpapp.mobile`
- **Default language:** English (India) – en-IN
- **App or game:** App
- **Free or paid:** Free (professionals pay a subscription inside the app)
- **Category:** Lifestyle  *(alternative: House & Home)*
- **Tags:** Local services, Home services, Marketplace
- **Contact email:** *(your support address, e.g. support@helpbharath.com)*
- **Website:** https://www.helpbharath.com
- **Privacy policy:** https://www.helpbharath.com/legal/privacy

## Short description (80 max)

```
Find trusted electricians, tutors, cleaners & 450+ local pros. Chat or call free.
```

## Full description (4000 max)

```
Need an electrician today, a home tutor for your child, or someone to deep-clean the house before guests arrive? help connects you with trusted local professionals right in your neighbourhood.

WHY PEOPLE USE HELP
• 450+ services in one app: electricians, plumbers, carpenters, AC repair, house cleaning, pest control, tutors, music teachers, beauticians, mehendi artists, drivers, photographers, caterers, packers and movers, and many more.
• See who you are hiring: real reviews from customers who contacted the professional, plus separate badges for verified mobile number, ID and qualification.
• Compare before you choose: ratings, years of experience, starting prices and distance on every profile.
• Available now: professionals show whether they are available, busy or away, so you know who can come today.
• Pros on the map: see who works in your area and how far they are.
• Chat or call directly: message inside the app or view their number. No middleman, no commission, and help is free for customers.
• Your privacy matters: your phone number is never shown to professionals, and their exact address is never public.

HOW IT WORKS
1. Search for a service or pick a category.
2. Compare professionals near you.
3. Chat or call, agree the job and price directly.
4. Rate them afterwards to help your neighbours.

FOR PROFESSIONALS
Electrician, tutor, beautician, photographer, mechanic or any skilled professional? Create a free profile in 4 short steps and get found by customers nearby.
• Show your services and prices
• Set your status as available, busy or away
• Receive chats from customers directly
• Keep every rupee you earn: no commission on your jobs
• One simple subscription to be listed in search

help is made in India for Indian neighbourhoods. Download it and find someone nearby who can help.
```

## Release notes (first release)

```
Welcome to help! Find trusted local professionals near you across 450+ services, compare ratings and prices, and chat or call them directly.
```

---

## App content (Policy section)

### App access
Select **All or some functionality is restricted** and add instructions:
```
Browsing professionals works without signing in. To chat, view a phone number or create a professional profile, sign in with "Continue with Google" or "Continue with email" (a 6-digit code is emailed to any address you enter).
```

### Ads
**No**, the app does not contain ads.

### Content rating (IARC questionnaire)
- Category: **Reference, News or Educational** → choose *All other app types* if asked
- Violence, sexual content, profanity, drugs, gambling: **No** to all
- Users can interact / communicate: **Yes** (chat between customers and professionals)
- Shares user location: **Yes** (approximate location to show nearby professionals)
- Digital purchases: **Yes** (professional subscription)
- Expected rating: Everyone / 3+ (Play may show "Users interact")

### Target audience
- Age groups: **18 and over**
- Appeals to children: **No**

### News app
**No**

### Government app
**No**

### Financial features
**None** (subscriptions are paid through Razorpay; no loans, trading or wallets)

### Health
**No health features**

### Data safety
Data is **encrypted in transit**: Yes. Users can **request deletion**: Yes (Profile → Privacy and data → Delete account). Data is **not sold** and **not shared** with third parties for advertising.

| Data type | Collected | Shared | Required? | Purpose |
|---|---|---|---|---|
| Name | Yes | No | Optional | Account management, App functionality |
| Email address | Yes | No | Optional | Account management, Sign-in |
| Phone number | Yes | No | Optional | Account management, Sign-in |
| Approximate location | Yes | No | Optional | App functionality (nearby professionals) |
| Precise location | Yes | No | Optional | App functionality (professionals set their base) |
| Photos | Yes | No | Optional | App functionality (profile and work photos) |
| Messages (in-app chat) | Yes | No | Optional | App functionality |
| Purchase history | Yes | No | Required for professionals | Subscription management |
| App interactions | Yes | No | Required | Analytics within help (profile views shown to professionals) |
| Device or other IDs (push token) | Yes | No | Optional | Notifications |

Third parties that process data on our behalf (service providers, not "sharing" under Play's definition): Google Firebase (notifications), Cloudinary (photo storage), Razorpay (payments), Neon (database hosting).

---

## Before you submit

1. Start with **Testing → Internal testing**, upload the app bundle, install it from the testing link.
2. After the first upload, copy the **App signing SHA-1** from *Test and release → App integrity → App signing* and add it to:
   - Google Cloud Console → Credentials → your **Android** OAuth client (package `com.helpapp.mobile`)
   - Firebase → Project settings → Android app → **Add fingerprint**

   Otherwise Google sign-in fails for Play Store installs.
3. New personal developer accounts must run a **closed test with 12+ testers for 14 days** before production access.
