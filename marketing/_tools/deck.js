// Sales deck for local professionals: why list on help. Run: node deck.js
const path = require('path');
const pptxgen = require('pptxgenjs');

const D = path.resolve(__dirname, '../_src/deck');
const OUT = path.resolve(__dirname, '../help-sales-deck.pptx');
const C = { navy: '13233F', teal: '0B7A6E', deep: '06574F', dot: '0D9488', yel: 'FFC21A', ysoft: 'FFF4CC', bg: 'F4F5F7', ink: '121722', sub: '3F4652', white: 'FFFFFF', tint: 'E7F5F2' };
// Inter is the brand font but isn't installed with Office; Segoe UI is the closest safe fallback that renders everywhere on Windows.
const F = 'Segoe UI', FB = 'Segoe UI', FX = 'Segoe UI Black';

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
pptx.title = 'help: get more customers from your neighbourhood';
pptx.company = 'help';

const PHONE_AR = 1034 / 1646;
function phone(s, name, x, y, h) { s.addImage({ path: `${D}/phone-${name}.png`, x, y, h, w: h * PHONE_AR }); }
function logo(s, x, y, size, light) {
  s.addImage({ path: `${D}/mark.png`, x, y, w: size, h: size });
  s.addText([{ text: 'help', options: { color: light ? C.white : C.navy } }, { text: '.', options: { color: C.dot } }],
    { x: x + size * 1.22, y: y - size * 0.12, w: 2.5, h: size * 1.24, fontFace: FB, fontSize: size * 54, bold: true, margin: 0, valign: 'middle' });
}
function base(s, dark) {
  s.background = { color: dark ? C.navy : C.bg };
}
function title(s, text, y = 1.25, color = C.navy, size = 38) {
  s.addText(text, { x: 0.75, y, w: 7.2, h: 1.5, fontFace: FB, fontSize: size, bold: true, color, margin: 0, valign: 'top', fit: 'shrink' });
}
function kicker(s, text, y = 0.95) {
  s.addText(text.toUpperCase(), { x: 0.75, y, w: 6, h: 0.3, fontFace: FB, fontSize: 12, color: C.teal, bold: true, charSpacing: 1.5, margin: 0 });
}
function bullets(s, items, y = 3.0, w = 7.0) {
  const rows = items.map(([h, b]) => [
    { text: h, options: { fontFace: FB, bold: true, color: C.navy, fontSize: 17, breakLine: true } },
    { text: b, options: { fontFace: F, color: C.sub, fontSize: 14, breakLine: true, paraSpaceAfter: 10 } },
  ]).flat();
  s.addText(rows, { x: 0.75, y, w, h: 7.5 - y - 0.6, valign: 'top', margin: 0, lineSpacingMultiple: 1.05 });
}
function blob(s, x, y, d, color = C.ysoft) { s.addShape(pptx.shapes.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0 } }); }
function footer(s, n) {
  s.addText(`help  ·  helpbharath.com`, { x: 0.75, y: 7.0, w: 5, h: 0.3, fontFace: F, fontSize: 10, color: '6B7280', margin: 0 });
  s.addText(String(n), { x: 12.1, y: 7.0, w: 0.5, h: 0.3, fontFace: F, fontSize: 10, color: '6B7280', align: 'right', margin: 0 });
}
function rightPhone(s, name) { blob(s, 8.45, 1.2, 4.6); phone(s, name, 9.0, 0.45, 6.6); }

// 1. Title
let s = pptx.addSlide(); base(s, true);
blob(s, 8.2, -1.2, 6.5, '1C3157');
logo(s, 0.75, 0.7, 0.55, true);
s.addText('Get more customers from your neighbourhood', { x: 0.75, y: 2.0, w: 7.3, h: 2.4, fontFace: FB, bold: true, fontSize: 44, color: C.white, margin: 0, valign: 'top' });
s.addText('help connects local professionals with people nearby who need them today. No commission on your work.', { x: 0.75, y: 4.45, w: 6.8, h: 1.0, fontFace: F, fontSize: 18, color: 'C9D3E3', margin: 0, valign: 'top' });
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.75, w: 3.1, h: 0.62, fill: { color: C.yel }, line: { color: C.yel }, rectRadius: 0.31 });
s.addText('helpbharath.com', { x: 0.75, y: 5.75, w: 3.1, h: 0.62, fontFace: FB, bold: true, fontSize: 16, color: C.navy, align: 'center', valign: 'middle', margin: 0 });
phone(s, 'home', 9.0, 0.45, 6.6);

// 2. Problem
s = pptx.addSlide(); base(s);
kicker(s, 'The problem');
title(s, 'Good professionals are hard to find, and hard to be found');
bullets(s, [
  ['Customers rely on word of mouth', 'Old visiting cards, calls that go unanswered, and no way to check who is coming.'],
  ['Middlemen take a cut', 'Many apps charge commission on every job, from the customer and from you.'],
  ['Your skills stay invisible', 'People two streets away still do not know you exist.'],
], 3.1);
rightPhone(s, 'results'); footer(s, 2);

// 3. Meet help
s = pptx.addSlide(); base(s);
kicker(s, 'Meet help');
title(s, 'One simple app for local services, free for customers');
const steps = [['1', 'They search', 'From 455 services, sorted by who is closest.'], ['2', 'They find you', 'Your profile, prices and reviews, up front.'], ['3', 'They contact you', 'Chat in the app or call you directly.']];
steps.forEach(([n, h, b], i) => {
  const y = 3.05 + i * 1.2;
  s.addShape(pptx.shapes.OVAL, { x: 0.75, y, w: 0.62, h: 0.62, fill: { color: C.teal }, line: { color: C.teal } });
  s.addText(n, { x: 0.75, y, w: 0.62, h: 0.62, fontFace: FB, bold: true, fontSize: 18, color: C.white, align: 'center', valign: 'middle', margin: 0 });
  s.addText([{ text: h, options: { fontFace: FB, bold: true, fontSize: 18, color: C.navy, breakLine: true } }, { text: b, options: { fontFace: F, fontSize: 14, color: C.sub } }], { x: 1.6, y: y - 0.08, w: 6, h: 0.95, margin: 0, valign: 'top' });
});
rightPhone(s, 'category'); footer(s, 3);

// 4. Profile sells for you
s = pptx.addSlide(); base(s);
kicker(s, 'Your profile');
title(s, 'A profile that sells for you, all day');
bullets(s, [
  ['Services and prices', 'Per visit, per session or a starting price. No surprises for customers.'],
  ['Verified badges', 'Mobile, I.D. and qualifications, checked by our team.'],
  ['Real reviews', 'Only customers who actually chatted with you can review you.'],
  ['Hours and work photos', 'Show when you work and what you have done.'],
], 2.95);
rightPhone(s, 'profile'); footer(s, 4);

// 5. Status
s = pptx.addSlide(); base(s);
kicker(s, 'Your dashboard');
title(s, 'Tell customers you are free, in one tap');
bullets(s, [
  ['Available, busy or away', 'Customers see your status right on your profile.'],
  ['Quick notes', '"On a job, back by 6 PM" or "On leave this week".'],
  ['See what is working', 'Profile views, chats started and number reveals over 7, 30 or 90 days.'],
], 3.0);
rightPhone(s, 'pro-dashboard'); footer(s, 5);

// 6. Direct contact
s = pptx.addSlide(); base(s);
kicker(s, 'Direct contact');
title(s, 'Customers come straight to you. You keep what you earn.');
bullets(s, [
  ['In-app chat', 'All conversations in one inbox, with notifications.'],
  ['Phone when they prefer', 'Signed-in customers can copy your number in one tap.'],
  ['Zero commission', 'You agree the price with the customer. We never take a cut.'],
], 3.15);
rightPhone(s, 'pro-messages'); footer(s, 6);

// 7. Trust & privacy
s = pptx.addSlide(); base(s);
kicker(s, 'Trust and privacy');
title(s, 'Safe for you and your customers');
bullets(s, [
  ['No exact address in public', 'Only an approximate service area is shown on the map.'],
  ['Numbers are protected', 'Shown only to signed-in users, never in search results.'],
  ['Report and block', 'Our team reviews reports, reviews and verifications.'],
  ['You are in control', 'Download your data or delete your account any time.'],
], 2.95);
rightPhone(s, 'explore'); footer(s, 7);

// 8. Jobs
s = pptx.addSlide(); base(s);
kicker(s, 'Jobs');
s.addText('Need a helper? Post a job on help', { x: 0.75, y: 1.25, w: 5.3, h: 1.6, fontFace: FB, fontSize: 36, bold: true, color: C.navy, margin: 0, valign: 'top' });
bullets(s, [
  ['Full-time, part-time or gig', 'Post in minutes. Edit, pause or close any time.'],
  ['Seen by people nearby', 'Job seekers in your area find it and contact you directly.'],
  ['No fees for job seekers', 'More people apply when it costs them nothing.'],
], 3.1, 5.3);
blob(s, 7.2, 1.6, 4.3); phone(s, 'pro-jobs', 6.25, 0.85, 5.9); phone(s, 'jobs', 9.2, 0.45, 6.4); footer(s, 8);

// 9. Pricing
s = pptx.addSlide(); base(s);
kicker(s, 'Simple pricing');
title(s, 'One small plan. No commission, ever.');
[[0.75, 'Pro Monthly', '₹199', 'per month', ['Visible in search', 'Unlimited enquiries', 'Verified badge eligibility', 'Dashboard insights']],
 [4.35, 'Pro Yearly', '₹1,999', 'per year · 2 months free', ['Everything in Monthly', 'Priority support']]].forEach(([x, n, p, per, feats], i) => {
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 2.95, w: 3.35, h: 3.5, fill: { color: i ? C.white : C.white }, line: { color: i ? C.yel : 'E6E8EC', width: i ? 2 : 1 }, rectRadius: 0.18 });
  if (i) { s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x + 1.75, y: 3.1, w: 1.4, h: 0.36, fill: { color: C.yel }, line: { color: C.yel }, rectRadius: 0.18 }); s.addText('Best value', { x: x + 1.75, y: 3.1, w: 1.4, h: 0.36, fontFace: FB, bold: true, fontSize: 11, color: C.navy, align: 'center', valign: 'middle', margin: 0 }); }
  s.addText(n, { x: x + 0.3, y: 3.15, w: 2.0, h: 0.4, fontFace: FB, bold: true, fontSize: 15, color: C.sub, margin: 0 });
  s.addText(p, { x: x + 0.3, y: 3.6, w: 3, h: 0.8, fontFace: FX, bold: true, fontSize: 36, color: C.navy, margin: 0 });
  s.addText(per, { x: x + 0.3, y: 4.35, w: 3, h: 0.35, fontFace: F, fontSize: 12, color: C.teal, margin: 0 });
  s.addText(feats.map((f) => ({ text: f, options: { bullet: { code: '2713' }, breakLine: true } })), { x: x + 0.3, y: 4.8, w: 2.9, h: 1.5, fontFace: F, fontSize: 13, color: C.ink, margin: 0, valign: 'top', paraSpaceAfter: 4 });
});
s.addText('Creating your profile is free. Customers never pay to use help.', { x: 0.75, y: 6.55, w: 7, h: 0.35, fontFace: F, fontSize: 13, color: C.sub, margin: 0 });
rightPhone(s, 'pro-subscription'); footer(s, 9);

// 10. CTA
s = pptx.addSlide(); base(s, true);
blob(s, -1.5, 4.2, 5, '1C3157');
logo(s, 0.75, 0.7, 0.55, true);
s.addText('Get started in 3 or 4 short steps', { x: 0.75, y: 1.75, w: 7, h: 1.4, fontFace: FB, bold: true, fontSize: 40, color: C.white, margin: 0, valign: 'top' });
s.addText([
  { text: 'Sign up with your phone, Google or email', options: { bullet: { type: 'number' }, breakLine: true } },
  { text: 'Add your service, photo and prices', options: { bullet: { type: 'number' }, breakLine: true } },
  { text: 'Set your area and working hours', options: { bullet: { type: 'number' }, breakLine: true } },
  { text: 'Go live and start getting enquiries', options: { bullet: { type: 'number' } } },
], { x: 0.75, y: 3.25, w: 6.8, h: 2.1, fontFace: F, fontSize: 18, color: 'DCE3EE', margin: 0, valign: 'top', paraSpaceAfter: 8 });
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.75, y: 5.75, w: 3.1, h: 0.62, fill: { color: C.yel }, line: { color: C.yel }, rectRadius: 0.31 });
s.addText('helpbharath.com', { x: 0.75, y: 5.75, w: 3.1, h: 0.62, fontFace: FB, bold: true, fontSize: 16, color: C.navy, align: 'center', valign: 'middle', margin: 0 });
s.addText('Trusted professionals, right around you.', { x: 4.05, y: 5.75, w: 4, h: 0.62, fontFace: F, fontSize: 14, color: 'C9D3E3', valign: 'middle', margin: 0 });
phone(s, 'welcome', 9.0, 0.45, 6.6);

pptx.writeFile({ fileName: OUT }).then((f) => console.log('wrote', f));
