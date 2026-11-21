/** Legal documents shown on the website (/legal/:slug) and in the app. One source so both always match. */
export interface LegalSection { h: string; p: string }
export interface LegalDoc { title: string; intro: string; updated: string; sections: LegalSection[] }

export const LEGAL_CONTACT = {
  email: 'support@helpbharath.com',
  website: 'https://www.helpbharath.com',
};

const UPDATED = '21 November 2026';

export const LEGAL_DOCS: Record<'terms' | 'privacy' | 'cancellation-refund' | 'grievance', LegalDoc> = {
  terms: {
    title: 'Terms of use',
    intro: 'These terms apply when you use the help app or the website helpbharath.com, as a customer or as a professional. By creating an account or using help, you agree to them.',
    updated: UPDATED,
    sections: [
      { h: 'What help is', p: 'help is an online directory that helps people in India find independent local professionals and contact them. Professionals listed on help are independent. They are not employees, agents or partners of help, and help does not perform, supervise or guarantee their work.' },
      { h: 'Who can use help', p: 'You must be at least 18 years old and able to enter into a binding contract under Indian law. You must give accurate information and keep it up to date. One person may hold one account, which can be used both as a customer and as a professional.' },
      { h: 'Your account', p: 'You sign in with your phone number, email address or Google account. Keep your sign-in methods secure. You are responsible for activity on your account. Tell us through Help centre > Contact support if you think someone else has used it.' },
      { h: 'Using help as a customer', p: 'Searching, comparing and contacting professionals is free for customers. Any job, price, schedule and payment is agreed directly between you and the professional. help is not a party to that agreement and does not collect payment for the work. Check the professional\'s details, reviews and badges before you hire, and agree the scope and price in advance.' },
      { h: 'Using help as a professional', p: 'You may create a profile for free. To be shown in search and receive new enquiries, you need an active paid subscription. You must only list services you are qualified and legally allowed to provide, use your own real photos and accurate prices, and hold any licence your work requires. Verification badges show only what help checked (mobile number, identity document or qualification). They are not a guarantee of quality.' },
      { h: 'Subscriptions and payments', p: 'Subscription prices are shown in the app before you pay. Payments are processed by Razorpay; help never stores your card or bank details. A subscription renews automatically until you turn off renewal. Your listing becomes active only after our server confirms the payment. Refunds follow our Cancellation and refund policy.' },
      { h: 'Reviews', p: 'Only customers who contacted a professional through help (by chat or by viewing their number) can review them, once per professional. Reviews must be honest and about your own experience. We may remove reviews that are fake, abusive, contain personal details or are unrelated to the professional.' },
      { h: 'Acceptable use', p: 'Do not post false or misleading information, impersonate anyone, harass or threaten others, share other people\'s personal details, post illegal or sexual content, send spam, scrape the service, or try to break or bypass its security. We may remove content, limit features or suspend accounts that break these rules or put others at risk.' },
      { h: 'Your content', p: 'You keep ownership of the photos, text and reviews you post. You give help a non-exclusive, royalty-free licence to host, display and share that content within the service and in promoting it, for as long as it stays on help.' },
      { h: 'Safety', p: 'Use your judgement when meeting anyone you find through help. If you feel unsafe, contact local emergency services first (112), then report the profile in the app.' },
      { h: 'Limitation of liability', p: 'help provides the directory "as is". To the extent allowed by law, help is not liable for the conduct, services, prices, quality, safety or legality of any professional or customer, or for losses arising from agreements between them. Where help is found liable, its total liability to you is limited to the amount you paid help in the 12 months before the claim (for customers, this is zero). Nothing in these terms limits liability that cannot be limited under Indian law.' },
      { h: 'Ending your use', p: 'You can delete your account at any time from Settings > Data and privacy, or by following the steps at helpbharath.com/delete-account. We may suspend or close accounts that break these terms.' },
      { h: 'Changes to these terms', p: 'We may update these terms. If changes are significant, we will tell you in the app or by email before they take effect. Continuing to use help after that means you accept the updated terms.' },
      { h: 'Governing law', p: 'These terms are governed by the laws of India. Disputes will first be handled through our grievance process. If not resolved, they fall under the jurisdiction of the competent courts in India.' },
      { h: 'Contact', p: `Questions about these terms: ${LEGAL_CONTACT.email}, or Help centre > Contact support in the app.` },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'This policy explains what personal data help collects, why, who we share it with, and the choices you have. It is written to meet the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000.',
    updated: UPDATED,
    sections: [
      { h: 'Data we collect', p: 'Account details: your name, phone number, email address and profile photo.\nLocation: an approximate location while you search for professionals, and, for professionals, the base location and service area you set.\nProfile content (professionals): services, prices, working hours, photos of your work, and verification documents you choose to upload (such as an ID or qualification certificate).\nMessages: chat messages between customers and professionals.\nActivity: searches, profiles viewed, saved professionals, reviews you write, and contact actions such as viewing a phone number.\nPayments (professionals): subscription plan, payment status and receipts. Card and bank details are entered directly with Razorpay and never reach help.\nDevice: device type, app version and a notification token used to send push notifications.' },
      { h: 'Why we use it', p: 'To create and secure your account; to show professionals near you and rank search results; to let customers and professionals chat; to process subscriptions; to send service notifications (messages, status, payments, account security); to verify professionals; to prevent fraud and abuse; to provide support; and to improve the service. We do not sell your personal data and we do not use it for third-party advertising.' },
      { h: 'Legal basis', p: 'We process your data with your consent, which you give when you create an account, and where the law allows processing without consent, such as to comply with legal obligations or respond to emergencies. You can withdraw consent at any time by deleting your account.' },
      { h: 'What other users can see', p: 'Professionals\' public profiles show their name, photo, services, prices, reviews, badges and an approximate area (about 1 km). The exact address is never shown. A professional\'s phone number is shown only to signed-in customers who tap to view it, and professionals can turn this off. A customer\'s phone number and email are never shown to professionals. Reviews show the reviewer\'s first name and last initial.' },
      { h: 'Who we share data with', p: 'We use trusted service providers to run help, under contracts that limit how they use your data: Neon (database), Render and Vercel (hosting), Cloudinary (photo storage), Google Firebase (push notifications), Google (sign-in with Google), Razorpay (payments) and our email provider (sign-in codes and notifications). We may disclose data when required by law, court order or a government authority, or to protect the safety of our users.' },
      { h: 'Where data is stored', p: 'Our main database is hosted in Singapore, and some providers may process data in other countries. We take steps to ensure your data receives protection consistent with Indian law wherever it is processed.' },
      { h: 'How long we keep it', p: 'We keep your data while your account is active. When you delete your account, we delete or anonymise your personal data within 30 days, except records we must keep by law (for example payment and tax records, kept for up to 8 years) and limited information needed to prevent fraud or resolve disputes.' },
      { h: 'Your rights', p: 'You can access, correct and update your data in the app; download a copy (Settings > Data and privacy > Download my data); delete your account and data (Settings > Data and privacy, or helpbharath.com/delete-account); withdraw consent; and raise a grievance. You may also nominate another person to exercise your rights in the event of death or incapacity by writing to us.' },
      { h: 'Security', p: 'Data is encrypted in transit (HTTPS). Access to personal data is limited to people who need it to run the service. Verification documents are stored privately and are never shown to other users. No system is perfectly secure, so please keep your sign-in methods safe.' },
      { h: 'Children', p: 'help is not meant for anyone under 18, and we do not knowingly collect data from children. If you believe a child has created an account, contact us and we will delete it.' },
      { h: 'Cookies and local storage', p: 'The website uses essential browser storage to keep you signed in and remember preferences such as your location. We do not use advertising cookies.' },
      { h: 'Changes to this policy', p: 'If we change this policy significantly, we will tell you in the app or by email before the change takes effect.' },
      { h: 'Contact and grievances', p: `Write to ${LEGAL_CONTACT.email}, or use Help centre > Contact support in the app. See the Grievance officer page for how complaints are handled.` },
    ],
  },
  'cancellation-refund': {
    title: 'Cancellation and refund policy',
    intro: 'How cancellations and refunds work on help.',
    updated: UPDATED,
    sections: [
      { h: 'Customers', p: 'Customers never pay help. Using help to search and contact professionals is free, so there is nothing to refund from help. Payment for any job is agreed directly with the professional, and any refund for that work is between you and them.' },
      { h: 'Professional subscriptions: cancelling', p: 'You can turn off renewal at any time from Settings > Subscription and plan. Your plan stays active until the end of the period you have already paid for, and your profile, reviews and chats are kept.' },
      { h: 'Professional subscriptions: refunds', p: 'Subscription fees are for a period of listing time and are generally non-refundable once that period has started. We will refund in full if you were charged twice for the same period, if you were charged after turning off renewal, or if your plan did not activate because of a fault on our side. Approved refunds go back to the original payment method within 7 working days of approval (your bank may take a few more days to show it).' },
      { h: 'Failed payments', p: 'If a renewal payment fails, you get a 3-day grace period with full access. If payment is not completed by then, your profile is hidden from search until you renew. Nothing is deleted.' },
      { h: 'How to request a refund', p: `Create a ticket in Help centre > Contact support with the topic "Payment", or write to ${LEGAL_CONTACT.email} with your registered phone or email and the payment receipt. We respond within 48 hours.` },
    ],
  },
  grievance: {
    title: 'Grievance officer',
    intro: 'How to raise a complaint about the service, your personal data or content on help, as required by the Information Technology Rules, 2021 and the Consumer Protection (E-Commerce) Rules, 2020.',
    updated: UPDATED,
    sections: [
      { h: 'Grievance officer', p: `Grievance Officer, help\nEmail: ${LEGAL_CONTACT.email}\nWebsite: ${LEGAL_CONTACT.website}` },
      { h: 'How to raise a complaint', p: 'Use Help centre > Contact support in the app (you get a ticket number you can track), or email the grievance officer. Include your registered phone or email, a description of the issue, and any screenshots or links that help us understand it.' },
      { h: 'Response time', p: 'We acknowledge complaints within 48 hours and aim to resolve them within 15 days. Complaints about unlawful content or impersonation are acted on as quickly as possible.' },
      { h: 'Reporting a profile or review', p: 'Use Report on any profile, or Block to stop a professional from contacting you. Our team reviews every report.' },
    ],
  },
};
