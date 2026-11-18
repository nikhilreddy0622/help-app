export type Block = { h2: string } | { p: string } | { ul: string[] };

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMins: number;
  tag: 'For customers' | 'For professionals' | 'Safety';
  cta?: { label: string; to: string };
  body: Block[];
}

export const POSTS: Post[] = [
  {
    slug: 'hiring-an-electrician-near-you',
    title: 'Hiring an electrician near you: what to check before you call',
    description: 'A short, practical checklist for finding a good local electrician — what to ask, what to look for in reviews, and how to agree a fair price.',
    date: '2026-11-14',
    readMins: 4,
    tag: 'For customers',
    cta: { label: 'Find electricians near you', to: '/search?q=electrician' },
    body: [
      { p: 'A flickering light or a tripping switch rarely waits for a convenient day. When you need an electrician, you usually need one soon — and that is exactly when it is easy to call the first number you find. A few minutes of checking first saves money and a repeat visit.' },
      { h2: 'Look at recent reviews, not just the star rating' },
      { p: 'A 4.8 from five reviews tells you less than a 4.5 from forty. Open the reviews and read a few. Look for mentions of the kind of job you need, whether they turned up on time, and whether the final price matched what was agreed.' },
      { h2: 'Check how far away they are' },
      { p: 'Someone 2 km away can often come the same day and is more likely to come back if something needs a second look. On help you can sort by distance and see who is available right now.' },
      { h2: 'Describe the problem clearly in your first message' },
      { ul: [
        'What is happening (for example, “MCB trips when the geyser is on”).',
        'Since when, and whether anything changed recently.',
        'A photo of the switchboard or fitting if you can.',
        'When you are free for a visit.',
      ] },
      { p: 'A clear first message gets you a clearer estimate, and it helps the electrician bring the right parts.' },
      { h2: 'Agree the visiting charge and the work before they start' },
      { p: 'Most electricians charge a visiting fee and then quote for the job once they have seen it. Ask about both up front. If parts are needed, ask for the price of the part separately from labour so you can compare.' },
      { h2: 'Ask what they checked' },
      { p: 'A good electrician will tell you the cause, not just the fix. If a wire was loose or a breaker was undersized, knowing that helps you avoid the same problem next month.' },
      { p: 'When the job is done, leave an honest review. It is the single most useful thing you can do for the next person in your area looking for help.' },
    ],
  },
  {
    slug: 'questions-to-ask-a-home-tutor',
    title: '8 questions to ask before you hire a home tutor',
    description: 'Choosing a tutor for your child? These eight questions help you understand how they teach, how they track progress and whether they are the right fit.',
    date: '2026-11-10',
    readMins: 5,
    tag: 'For customers',
    cta: { label: 'Browse tutors near you', to: '/search?q=tutor' },
    body: [
      { p: 'A good tutor can change how a child feels about a subject. A poor fit can waste a whole term. A short conversation before the first class tells you a lot — here is what to ask.' },
      { h2: '1. Which classes and boards do you usually teach?' },
      { p: 'CBSE, ICSE and state boards cover topics in different orders and depths. A tutor who knows your child’s board will plan around the school calendar instead of against it.' },
      { h2: '2. How do you start with a new student?' },
      { p: 'Listen for some kind of first assessment — a short test or a conversation about where your child is struggling. Starting from the textbook’s chapter one is a warning sign.' },
      { h2: '3. How will I know if it is working?' },
      { p: 'Ask how often they will update you and in what form. A quick message after each week is plenty for most families.' },
      { h2: '4. Can we do a trial class?' },
      { p: 'Many tutors offer one. Watch how your child responds afterwards more than the class itself.' },
      { h2: '5. Online, at our home, or at yours?' },
      { p: 'Each works. What matters is a quiet space and consistency. If they travel to you, check how far away they are — long commutes lead to cancelled classes.' },
      { h2: '6. What do you charge, and how?' },
      { p: 'Per class, per month, or per subject. Ask what happens with missed classes on either side so there are no surprises.' },
      { h2: '7. How do you handle exam season?' },
      { p: 'Extra classes, revision tests, past papers? Better to know in June than in February.' },
      { h2: '8. Can I speak to another parent you teach?' },
      { p: 'Reviews on their profile help, but a two-minute call with another parent is even better.' },
    ],
  },
  {
    slug: 'staying-safe-hiring-local-help',
    title: 'Staying safe when you hire someone to come to your home',
    description: 'Simple habits that keep you and your family safe when a professional visits — before, during and after the job.',
    date: '2026-11-06',
    readMins: 3,
    tag: 'Safety',
    body: [
      { p: 'Almost every visit goes exactly as planned. These habits are for the rare one that does not, and they take less than a minute.' },
      { h2: 'Before the visit' },
      { ul: [
        'Check what each badge on the profile means. On help, mobile number, ID and qualification checks are shown separately, so you know exactly what was verified.',
        'Read the reviews, especially recent ones.',
        'Keep the conversation in the app so there is a record of what was agreed.',
        'Tell someone at home, or a neighbour, when the visit is.',
      ] },
      { h2: 'During the visit' },
      { ul: [
        'Keep valuables and documents out of the work area.',
        'Stay reachable on your phone.',
        'If anything feels wrong, it is fine to end the visit politely and pay only for work done.',
      ] },
      { h2: 'After the visit' },
      { ul: [
        'Pay the amount you agreed — ask for a written breakdown for larger jobs.',
        'Leave an honest review so others can decide well.',
        'If something went wrong, use Report on the profile or raise a support ticket under Safety. In an emergency, call 112 first.',
      ] },
    ],
  },
  {
    slug: 'get-more-local-customers',
    title: 'For professionals: how to get more customers from your neighbourhood',
    description: 'What makes customers pick one profile over another — photos, prices, status and quick replies. Practical tips from how people actually search.',
    date: '2026-11-02',
    readMins: 4,
    tag: 'For professionals',
    cta: { label: 'Create your free profile', to: '/pro/onboarding' },
    body: [
      { p: 'Customers on help usually look at three or four profiles before they message anyone. Small things decide which one they pick. Here is what makes the difference.' },
      { h2: 'Use a clear, friendly photo of yourself' },
      { p: 'People are inviting you into their home. A real photo of your face — not a logo or a tool — builds trust before you have said a word.' },
      { h2: 'Show your prices' },
      { p: 'Even a starting price (“visit from ₹199”) gets more messages than “price on request”. Customers want a rough idea before they reach out.' },
      { h2: 'Add photos of your work' },
      { p: 'A finished wiring panel, a neat tiling job, a well-decorated event. Three or four good photos do more than a long description.' },
      { h2: 'Keep your status up to date' },
      { p: 'Customers can filter for who is available now. Switching to Available when you are free puts you at the top of their list. Set Busy with a return time when you are on a job — it is better than not replying.' },
      { h2: 'Reply quickly' },
      { p: 'The first professional to reply often gets the job. Turn on notifications and use quick replies for common questions.' },
      { h2: 'Ask happy customers for a review' },
      { p: 'Reviews are the biggest reason customers choose one profile over another. After a good job, a simple “it would really help me if you left a review” works.' },
    ],
  },
  {
    slug: 'writing-a-review-that-helps',
    title: 'How to write a review that actually helps your neighbours',
    description: 'A good review takes a minute and helps the next person choose well. What to include, what to leave out, and why it matters.',
    date: '2026-10-28',
    readMins: 2,
    tag: 'For customers',
    body: [
      { p: 'When you were looking for help, reviews probably shaped your choice. Yours will do the same for someone else. A useful review answers the questions you had before you hired.' },
      { h2: 'Include' },
      { ul: [
        'What the job was (“replaced a ceiling fan and fixed a loose socket”).',
        'Whether they arrived when they said they would.',
        'Whether the final price matched what was agreed.',
        'How they left the place afterwards.',
      ] },
      { h2: 'Leave out' },
      { ul: [
        'Phone numbers, addresses or other personal details.',
        'Anything you would not say to their face.',
      ] },
      { p: 'If something went wrong, say so calmly and specifically. Professionals can reply to reviews, and a fair, clear review helps everyone — including them.' },
    ],
  },
];

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);
