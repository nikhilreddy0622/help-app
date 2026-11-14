export interface Faq { q: string; a: string }
export interface FaqSection { title: string; items: Faq[] }

export const FAQ: FaqSection[] = [
  {
    title: 'Chat and contact',
    items: [
      { q: 'How do I contact a professional?', a: 'Open a profile and tap Chat. Write your first message and send. Replies arrive in the Messages tab.' },
      { q: 'How do I see a phone number?', a: 'Tap Show phone number on a profile (you need to be signed in). It appears with a Copy button. Not every professional shares a number; chat is always available.' },
      { q: 'What do Available, Busy and Away mean?', a: 'Professionals set their own status. Available means they are taking messages and work. Busy or Away shows when they expect to be back. You can still message; they reply when back. Updated times show how fresh the status is.' },
      { q: 'What is an auto-reply?', a: 'When a professional is Busy or Away they can send a short automatic message so you know when to expect an answer. It is marked Auto-reply in chat.' },
      { q: 'How do I write a review?', a: 'After you chat with a professional and they reply, you can review them from the chat or their profile. Each customer can review a professional once.' },
    ],
  },
  {
    title: 'Payments and subscriptions',
    items: [
      { q: 'Do customers pay help?', a: 'No. help is free for customers. You pay the professional directly for the work.' },
      { q: 'How does the professional subscription work?', a: 'Professionals pay a monthly or yearly plan to be visible in search and to receive new enquiries. Your profile and reviews are never deleted if a plan ends.' },
      { q: 'When does my plan become active?', a: 'After you pay, our server confirms the payment with Razorpay. This usually takes a few seconds. The app never activates a plan on its own.' },
      { q: 'What happens if a renewal payment fails?', a: 'You get a 3-day grace period during which your profile stays visible. Update your payment method to continue. Your profile and reviews are never deleted.' },
      { q: 'How do I stop renewals?', a: 'Go to Settings, Subscription and plan, and tap Cancel renewal. You keep access until the end of the period you already paid for. Refunds follow the Refund policy.' },
    ],
  },
  {
    title: 'Safety',
    items: [
      { q: 'How are professionals verified?', a: 'Badges show what has been checked: mobile number, identity document and qualification. Each badge is separate, so you can see exactly what is verified.' },
      { q: 'What should I avoid sharing?', a: 'Never share OTPs, card or bank details. help staff will never ask for them.' },
      { q: 'How do I report or block someone?', a: 'Open their profile, tap the three dots and choose Report or Block. Every report is reviewed.' },
      { q: 'I feel unsafe. What now?', a: 'If you are in danger call local emergency services first. Then create a Safety ticket in Support so we can act on the account.' },
    ],
  },
  {
    title: 'Account and privacy',
    items: [
      { q: 'I lost my phone number. Can I still sign in?', a: 'Yes. Sign in with your email code or Google, then go to Profile, Linked accounts and change your mobile number.' },
      { q: 'Can I use help as a customer and a professional?', a: 'Yes, one account does both. Switch between them from Profile, or Settings in provider mode.' },
      { q: 'How do I download or delete my data?', a: 'Go to Profile, Privacy and data. You can export your data or delete your account there.' },
      { q: 'Who can see my details?', a: 'Your phone number is never shown to professionals unless you share it in chat. Public profiles never show a professional’s private phone, email or home address.' },
    ],
  },
  {
    title: 'For professionals',
    items: [
      { q: 'How do I get more enquiries?', a: 'Complete your profile, add clear photos and services with prices, keep your weekly hours current and verify your identity. Reply quickly: response time is shown to customers.' },
      { q: 'How do I show I am available today?', a: 'Set your status on the Dashboard. To disappear from search for a while, turn off Show my profile to customers.' },
      { q: 'How do customers know if I am free?', a: 'Set Available, Busy or Away on your Dashboard with an optional note and return time. Tap Still available? to keep the Updated time fresh.' },
      { q: 'Why is my profile hidden?', a: 'Profiles are visible only with an active plan and a complete profile. Check the banner on your Dashboard.' },
    ],
  },
];
