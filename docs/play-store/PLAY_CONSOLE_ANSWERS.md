# Play Console — answers in checklist order

Go down the "Finish setting up your app" list top to bottom. Each section matches one item.
Images for the store listing are in this folder (`icon-512.png`, `feature-graphic-1024x500.png`, `screenshots/`).

---

## 1. Set privacy policy

**Privacy policy URL**
```
https://www.helpbharath.com/legal/privacy
```

---

## 2. Sign in details (App access)

Choose: **All or some functionality in my app is restricted** → **Add instructions**

**Name:**
```
Sign in for chat and phone numbers
```

**Username / Password:** leave empty (no fixed password; sign-in uses Google or a one-time email code)

**Any other information required to access your app:**
```
Browsing and searching professionals works without signing in. To chat with a professional, view a phone number, write a review or create a professional profile, tap Profile > Sign in, then choose "Continue with Google" or "Continue with email". For email, enter any address you can open; a 6-digit code is emailed within a minute. No payment is needed to review the app.
```

Tick: **Allow Android to use the credentials you provide for performance and app compatibility testing** → leave unticked (there are no fixed credentials).

---

## 3. Ads

**Does your app contain ads?**
```
No, my app does not contain ads
```

---

## 4. Content rating

Click **Start questionnaire**.

- **Email address:** your contact email
- **Category:** All other app types (Not a game)

Answer:
| Question | Answer |
|---|---|
| Violence | No |
| Sexuality / nudity | No |
| Language (profanity) | No |
| Controlled substances (drugs, alcohol, tobacco) | No |
| Gambling / simulated gambling | No |
| Does the app allow users to interact or exchange content? | **Yes** |
| Does the app share the user's current physical location with other users? | **No** (only an approximate area of professionals is shown) |
| Does the app allow users to purchase digital goods? | **Yes** (professional subscription) |
| Is it a web browser or search engine? | No |
| Unrestricted internet access? | No |
| Is it primarily a news app? | No |

Expected result: **Everyone / 3+** with the note "Users Interact, In-App Purchases".

---

## 5. Target audience

- **Target age groups:** tick only **18 and over**
- **Could your store listing unintentionally appeal to children?** No
- **App contains/has appeal to children?** No

---

## 6. Data safety

**Data collection and security**
| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Delete-account URL (if asked) | `https://www.helpbharath.com/account/settings/data` |

**Data types: tick these, everything else unticked**

| Section | Data type | Collected | Shared | Processed ephemerally | Required or optional | Purposes |
|---|---|---|---|---|---|---|
| Location | Approximate location | Yes | No | No | Optional | App functionality |
| Location | Precise location | Yes | No | No | Optional | App functionality |
| Personal info | Name | Yes | No | No | Optional | App functionality, Account management |
| Personal info | Email address | Yes | No | No | Optional | App functionality, Account management |
| Personal info | Phone number | Yes | No | No | Optional | App functionality, Account management |
| Financial info | Purchase history | Yes | No | No | Optional | App functionality |
| Messages | Other in-app messages | Yes | No | No | Optional | App functionality |
| Photos and videos | Photos | Yes | No | No | Optional | App functionality |
| App activity | App interactions | Yes | No | No | Optional | Analytics, App functionality |
| Device or other IDs | Device or other IDs | Yes | No | No | Optional | App functionality (notifications) |

"Shared" is **No** everywhere: Firebase, Cloudinary, Razorpay and our database host act as service providers on our behalf, which Play does not count as sharing.

---

## 7. Government apps

```
No
```

---

## 8. Financial features

Tick: **My app doesn't provide any financial features**
(Subscriptions paid through Razorpay are purchases, not a financial feature.)

---

## 9. Health

Tick: **My app does not have any health features**

---

## 10. Trader status

The app earns money (professional subscriptions), so under EU rules you count as a **trader**.

- **Are you a trader?** Yes, I'm a trader
- Play will ask for (and show to users in the EU) a **contact email, phone number and address**. Use a business/support email and phone you are happy to make public.
- If you only want to publish in **India**, still answer this, then in *Test and release → Production → Countries/regions* select only **India**. Your trader details are then not shown in EU store pages because the app isn't listed there.

---

## 11. Select an app category and provide contact details (Store settings)

| Field | Value |
|---|---|
| App or game | App |
| Category | **Lifestyle** |
| Tags | Local services, Home services, Marketplace (pick the closest offered) |
| Email address | *your public support email* |
| Phone number | *optional* |
| Website | `https://www.helpbharath.com` |
| External marketing | Allow (default) |

---

## 12. Set up your store listing (Main store listing)

**App name** (30 max)
```
help – Local Pros Near You
```

**Short description** (80 max)
```
Find trusted electricians, tutors, cleaners & 450+ local pros. Chat or call free.
```

**Full description** (4000 max)
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

**Graphics**
| Field | File |
|---|---|
| App icon | `icon-512.png` |
| Feature graphic | `feature-graphic-1024x500.png` |
| Phone screenshots | all 8 files in `screenshots/` (upload in order 01 → 08) |
| Video (optional) | upload `promo-video-1080x1920.mp4` to YouTube (Unlisted), paste the link |
| 7-inch / 10-inch tablet screenshots | optional, skip |

**Release notes** (when you upload the build)
```
Welcome to help! Find trusted local professionals near you across 450+ services, compare ratings and prices, and chat or call them directly.
```
