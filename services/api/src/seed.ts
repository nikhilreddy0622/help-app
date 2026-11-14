import { pathToFileURL } from 'node:url';
import { profileCompleteness, slugify } from '@help/domain';
import bcrypt from 'bcryptjs';
import { logger, prisma } from './lib/core';

/** Home-screen groups (lucide icon) with their subcategories [slug, name]. */
export const CATEGORY_GROUPS: { slug: string; name: string; icon: string; children: [string, string][] }[] = [
  { slug: 'home-services', name: 'Home Services', icon: 'home', children: [['plumbers', 'Plumbers'], ['electricians', 'Electricians'], ['carpenters', 'Carpenters'], ['painters', 'Painters'], ['cleaning', 'Cleaning'], ['pest-control', 'Pest Control'], ['appliance-repair', 'Appliance Repair']] },
  { slug: 'education', name: 'Education', icon: 'graduation-cap', children: [['tutors', 'Tutors'], ['music-teachers', 'Music Teachers'], ['language-classes', 'Language Classes'], ['coaching', 'Coaching']] },
  { slug: 'automotive', name: 'Automotive', icon: 'car', children: [['mechanics', 'Mechanics'], ['drivers', 'Drivers'], ['car-wash', 'Car Wash'], ['bike-repair', 'Bike Repair']] },
  { slug: 'health-fitness', name: 'Health & Fitness', icon: 'heart-pulse', children: [['yoga-trainers', 'Yoga Trainers'], ['gym-trainers', 'Gym Trainers'], ['physiotherapists', 'Physiotherapists'], ['dietitians', 'Dietitians']] },
  { slug: 'photography', name: 'Photography', icon: 'camera', children: [['photographers', 'Photographers'], ['videographers', 'Videographers'], ['photo-editing', 'Photo Editing']] },
  { slug: 'repairs', name: 'Repairs', icon: 'wrench', children: [['mobile-repair', 'Mobile Repair'], ['laptop-repair', 'Laptop Repair'], ['ac-repair', 'AC Repair'], ['furniture-repair', 'Furniture Repair']] },
  { slug: 'construction', name: 'Construction', icon: 'building-2', children: [['masons', 'Masons'], ['contractors', 'Contractors'], ['interior-designers', 'Interior Designers'], ['architects', 'Architects']] },
  { slug: 'business', name: 'Business', icon: 'briefcase', children: [['accountants', 'Accountants'], ['legal-advisors', 'Legal Advisors'], ['consultants', 'Consultants'], ['marketing', 'Marketing']] },
  { slug: 'it-software', name: 'IT & Software', icon: 'monitor', children: [['web-developers', 'Web Developers'], ['app-developers', 'App Developers'], ['it-support', 'IT Support'], ['graphic-designers', 'Graphic Designers']] },
  { slug: 'agriculture', name: 'Agriculture', icon: 'sprout', children: [['gardeners', 'Gardeners'], ['farm-labour', 'Farm Labour'], ['landscaping', 'Landscaping']] },
  { slug: 'events', name: 'Events', icon: 'party-popper', children: [['event-planners', 'Event Planners'], ['decorators', 'Decorators'], ['caterers', 'Caterers'], ['djs', 'DJs']] },
];

export async function seedCatalog() {
  let i = 0;
  for (const g of CATEGORY_GROUPS) {
    const group = await prisma.category.upsert({
      where: { slug: g.slug },
      create: { slug: g.slug, name: g.name, icon: g.icon, sortOrder: i * 100 },
      update: { name: g.name, icon: g.icon, sortOrder: i * 100, parentId: null },
    });
    let j = 1;
    for (const [slug, name] of g.children) {
      await prisma.category.upsert({
        where: { slug },
        create: { slug, name, icon: g.icon, parentId: group.id, sortOrder: i * 100 + j },
        update: { name, icon: g.icon, parentId: group.id, sortOrder: i * 100 + j },
      });
      j++;
    }
    i++;
  }
  const plans = [
    { code: 'PRO_MONTHLY', name: 'Pro Monthly', interval: 'MONTHLY' as const, pricePaise: 19900, features: ['Visible in search', 'Unlimited enquiries', 'Verified badge eligibility', 'Dashboard insights'] },
    { code: 'PRO_YEARLY', name: 'Pro Yearly', interval: 'YEARLY' as const, pricePaise: 199900, features: ['Everything in Monthly', '2 months free', 'Priority support'] },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({ where: { code: p.code }, create: p, update: { name: p.name, features: p.features } });
  }
}

/** SUPER_ADMIN from env. Dev-only fallback credentials are used outside production. */
export async function seedAdmin() {
  const prod = process.env.NODE_ENV === 'production';
  const email = process.env.ADMIN_EMAIL ?? (prod ? undefined : 'admin@help.local');
  const password = process.env.ADMIN_PASSWORD ?? (prod ? undefined : 'Admin@12345');
  if (!email || !password) {
    logger.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin seed');
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), name: 'Super Admin', role: 'SUPER_ADMIN', passwordHash },
    update: { passwordHash, role: 'SUPER_ADMIN', isActive: true },
  });
}

// ---------- demo data (Bengaluru) ----------
const AREAS = [
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, pin: '560038' },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245, pin: '560034' },
  { name: 'HSR Layout', lat: 12.9116, lng: 77.6389, pin: '560102' },
];
const FIRST = ['Ramesh', 'Suresh', 'Anita', 'Priya', 'Mohammed', 'Kiran', 'Lakshmi', 'Vijay', 'Deepa', 'Arjun', 'Farhan', 'Meena', 'Sanjay', 'Divya', 'Manoj', 'Rekha', 'Naveen', 'Pooja', 'Imran', 'Geetha'];
const LAST = ['Kumar', 'Reddy', 'Shetty', 'Nair', 'Gowda', 'Iyer', 'Khan', 'Rao', 'Patil', 'Menon'];
const REVIEW_TEXT = ['Arrived on time and finished quickly.', 'Very professional and fairly priced.', 'Great work, would hire again.', 'Polite, neat and explained everything.', 'Good job but took a little longer than expected.'];

type Unit = 'HOURLY' | 'PER_VISIT' | 'FIXED' | 'STARTING_AT' | 'PER_SESSION' | 'PER_DAY';
const GROUP_PROFILES: Record<string, { headline: string; skills: string[]; services: [string, Unit, number][] }> = {
  'home-services': { headline: 'Reliable home services, on time', skills: ['Repairs', 'Installation', 'Maintenance'], services: [['Visit and diagnosis', 'PER_VISIT', 29900], ['Full job', 'STARTING_AT', 99900]] },
  education: { headline: 'Patient, result-focused teaching', skills: ['One-to-one', 'Exam prep', 'Online classes'], services: [['1-hour session', 'PER_SESSION', 50000], ['Monthly plan', 'FIXED', 400000]] },
  automotive: { headline: 'Trusted vehicle care and driving', skills: ['Servicing', 'Diagnosis', 'Doorstep'], services: [['General service', 'FIXED', 249900], ['Doorstep visit', 'PER_VISIT', 49900]] },
  'health-fitness': { headline: 'Certified, personalised plans', skills: ['Personal training', 'Rehab', 'Nutrition'], services: [['Single session', 'PER_SESSION', 80000], ['Monthly plan', 'FIXED', 600000]] },
  photography: { headline: 'Weddings, portraits and events', skills: ['Wedding', 'Portrait', 'Event coverage'], services: [['Portrait shoot (2h)', 'FIXED', 450000], ['Event coverage', 'PER_DAY', 1500000]] },
  repairs: { headline: 'Fast repairs with warranty', skills: ['Diagnosis', 'Part replacement', 'Doorstep'], services: [['Diagnosis', 'PER_VISIT', 19900], ['Repair', 'STARTING_AT', 59900]] },
  construction: { headline: 'Quality build and design work', skills: ['Site work', 'Planning', 'Finishing'], services: [['Site visit', 'PER_VISIT', 49900], ['Project', 'STARTING_AT', 2500000]] },
  business: { headline: 'Practical advice for small businesses', skills: ['Compliance', 'Planning', 'Advisory'], services: [['Consultation (1h)', 'HOURLY', 100000], ['Monthly retainer', 'FIXED', 500000]] },
  'it-software': { headline: 'Modern builds and dependable support', skills: ['Web', 'Mobile', 'Support'], services: [['Hourly support', 'HOURLY', 80000], ['Small project', 'STARTING_AT', 1500000]] },
  agriculture: { headline: 'Garden and farm care', skills: ['Planting', 'Pruning', 'Maintenance'], services: [['Maintenance visit', 'PER_VISIT', 40000], ['Setup', 'STARTING_AT', 500000]] },
  events: { headline: 'Stress-free events, start to finish', skills: ['Planning', 'Vendors', 'On-day coordination'], services: [['Planning consult', 'PER_VISIT', 100000], ['Event package', 'STARTING_AT', 2000000]] },
};
/** 30 demo providers: at least two per group. */
const DEMO_SLUGS = [
  'plumbers', 'electricians', 'carpenters', 'painters', 'cleaning',
  'tutors', 'music-teachers', 'language-classes',
  'mechanics', 'drivers', 'bike-repair',
  'yoga-trainers', 'physiotherapists',
  'photographers', 'videographers',
  'mobile-repair', 'ac-repair', 'laptop-repair',
  'masons', 'interior-designers',
  'accountants', 'legal-advisors',
  'web-developers', 'graphic-designers',
  'gardeners', 'landscaping',
  'event-planners', 'decorators', 'caterers', 'djs',
];

const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

const IST_OFFSET_MIN = 330;
/** Demo statuses: mostly AVAILABLE, some BUSY (back by 6 PM today), some AWAY (until Monday 9 AM), one paused. */
function demoPresence(n: number) {
  const now = Date.now();
  const statusUpdatedAt = new Date(now - (n % 4 === 2 ? 30 * 3_600_000 : (n * 37 + 5) * 60_000));
  if (n % 5 === 1) {
    // today 18:00 IST (tomorrow if already past)
    const d = new Date(now + IST_OFFSET_MIN * 60_000);
    let until = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 18, 0) - IST_OFFSET_MIN * 60_000;
    if (until <= now + 30 * 60_000) until += 86_400_000;
    return { presenceStatus: 'BUSY' as const, statusMessage: 'On a job, back by 6 PM', statusUntil: new Date(until), statusUpdatedAt: new Date(now - 90 * 60_000), isPaused: false };
  }
  if (n % 5 === 3) {
    const d = new Date(now + IST_OFFSET_MIN * 60_000);
    const add = ((8 - d.getUTCDay()) % 7) || 7; // next Monday
    const until = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + add, 9, 0) - IST_OFFSET_MIN * 60_000;
    return { presenceStatus: 'AWAY' as const, statusMessage: 'Available from Monday', statusUntil: new Date(until), statusUpdatedAt: new Date(now - 5 * 3_600_000), isPaused: false };
  }
  return { presenceStatus: 'AVAILABLE' as const, statusMessage: null, statusUntil: null, statusUpdatedAt, isPaused: n === 10 };
}

export async function seedDemo(count = 30) {
  const rand = rng(42);
  const cats = await prisma.category.findMany();
  const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: 'PRO_MONTHLY' } });
  const customers: string[] = [];
  for (let c = 0; c < 4; c++) {
    const phone = `+91900000010${c}`;
    const u = await prisma.user.upsert({
      where: { phone },
      create: { phone, phoneVerified: true, name: ['Aarav Mehta', 'Sneha Joshi', 'Rohit Verma', 'Nisha Kapoor'][c]!, city: 'Bengaluru', identities: { create: { provider: 'PHONE', providerUserId: phone } } },
      update: {},
    });
    customers.push(u.id);
  }

  for (let n = 0; n < count; n++) {
    const cat = cats.find((c) => c.slug === DEMO_SLUGS[n % DEMO_SLUGS.length]!)!;
    const group = cats.find((c) => c.id === cat.parentId)!;
    const prof = GROUP_PROFILES[group.slug]!;
    const area = AREAS[n % AREAS.length]!;
    const first = FIRST[n % FIRST.length]!;
    const last = LAST[(n * 3) % LAST.length]!;
    const name = `${first} ${last}`;
    const phone = `+9190000002${String(n).padStart(2, '0')}`;
    const lat = area.lat + (rand() - 0.5) * 0.02;
    const lng = area.lng + (rand() - 0.5) * 0.02;
    const user = await prisma.user.upsert({
      where: { phone },
      create: { phone, phoneVerified: true, name, city: 'Bengaluru', identities: { create: { provider: 'PHONE', providerUserId: phone } } },
      update: {},
    });
    const base = slugify(name, cat.name, 'Bengaluru');
    const publishedAt = new Date(Date.now() - (n % 5 === 0 ? 5 : 90) * 86_400_000);
    const data = {
      displayName: name,
      headline: prof.headline,
      bio: `${name} is a ${cat.name.toLowerCase().replace(/s$/, '')} based in ${area.name}, Bengaluru with years of hands-on experience serving homes nearby. Reliable, punctual and transparent about pricing.`,
      primaryCategoryId: cat.id,
      experienceYears: 2 + ((n * 7) % 15),
      languages: n % 3 === 0 ? ['English', 'Kannada', 'Hindi'] : ['English', 'Kannada'],
      city: 'Bengaluru', pinCode: area.pin, locality: area.name, lat, lng,
      serviceRadiusKm: 8, serviceMode: 'ONSITE' as const, status: 'PUBLISHED' as const, publishedAt,
      mobileVerified: true, identityVerified: n % 2 === 0, qualificationVerified: n % 4 === 0,
      verificationLevel: 1 + (n % 2 === 0 ? 1 : 0) + (n % 4 === 0 ? 1 : 0),
      avatarUrl: `https://i.pravatar.cc/300?u=help-demo-${n}`,
      responseMinutes: 10 + ((n * 13) % 90),
      ...demoPresence(n),
      showPhone: n % 6 !== 5,
      autoReplyEnabled: true,
      quickReplies: ['Hi! Thanks for reaching out. How can I help?', 'I can visit today. What is your locality?', 'Please share a photo of the issue.'],
    };
    const provider = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, slug: `${base}-${String(n).padStart(2, '0')}`, ...data },
      update: data,
    });

    await prisma.availabilityRule.deleteMany({ where: { providerId: provider.id } });
    const days = n % 4 === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    await prisma.availabilityRule.createMany({ data: days.map((weekday) => ({ providerId: provider.id, weekday, startMinute: 9 * 60, endMinute: n % 3 === 0 ? 21 * 60 : 18 * 60 })) });

    if (!(await prisma.serviceOffering.count({ where: { providerId: provider.id } }))) {
      await prisma.serviceOffering.createMany({ data: prof.services.map(([title, priceUnit, pricePaise], i) => ({ providerId: provider.id, categoryId: cat.id, title, priceUnit, pricePaise, sortOrder: i })) });
    }
    await prisma.providerSkill.deleteMany({ where: { providerId: provider.id } });
    for (const s of prof.skills) {
      const skill = await prisma.skill.upsert({ where: { name: s }, create: { name: s }, update: {} });
      await prisma.providerSkill.create({ data: { providerId: provider.id, skillId: skill.id } });
    }
    if (!(await prisma.portfolioItem.count({ where: { providerId: provider.id } }))) {
      await prisma.portfolioItem.create({ data: { providerId: provider.id, kind: 'IMAGE', url: `https://picsum.photos/seed/help-${n}/800/600`, title: 'Recent work' } });
    }
    await prisma.providerProfile.update({
      where: { id: provider.id },
      data: {
        completeness: profileCompleteness({ hasPhoto: true, hasHeadline: true, bioLength: 100, skillsCount: prof.skills.length, servicesCount: prof.services.length, hasLocation: true, hasAvailability: true, portfolioCount: 1 }),
      },
    });

    const sid = `demo_sub_${n}`;
    await prisma.subscription.upsert({
      where: { razorpaySubscriptionId: sid },
      create: { providerId: provider.id, planId: plan.id, status: 'ACTIVE', razorpaySubscriptionId: sid, currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) },
      update: { status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000) },
    });
    await prisma.providerProfile.update({ where: { id: provider.id }, data: { isDiscoverable: !data.isPaused } });

    // conversations where the provider replied + reviews from those customers (every 5th stays brand new)
    if (n % 5 !== 0) {
      const k = 1 + (n % 3);
      for (let j = 0; j < k; j++) {
        const customerId = customers[(n + j) % customers.length]!;
        const convId = `demo_conv_${n}_${j}`;
        const at = new Date(Date.now() - (j + 2) * 3 * 86_400_000);
        const replyAt = new Date(at.getTime() + 12 * 60_000);
        await prisma.conversation.upsert({
          where: { id: convId },
          create: { id: convId, customerId, providerId: provider.id, createdAt: at, lastMessageAt: replyAt, providerFirstReplyAt: replyAt, customerLastReadAt: replyAt, providerLastReadAt: replyAt },
          update: {},
        });
        await prisma.message.upsert({
          where: { id: `${convId}_a` },
          create: { id: `${convId}_a`, conversationId: convId, senderId: customerId, body: `Hi, do you handle ${prof.services[0]![0].toLowerCase()} in ${area.name}?`, createdAt: at, readAt: replyAt },
          update: {},
        });
        await prisma.message.upsert({
          where: { id: `${convId}_b` },
          create: { id: `${convId}_b`, conversationId: convId, senderId: user.id, body: 'Yes, I can help. Share your exact location and a good time.', createdAt: replyAt, readAt: replyAt },
          update: {},
        });
        const stars = 4 + Math.floor(rand() * 2);
        await prisma.review.upsert({
          where: { authorId_providerId: { authorId: customerId, providerId: provider.id } },
          create: {
            providerId: provider.id, authorId: customerId, overall: stars, quality: stars, behaviour: 5, punctuality: stars, value: 4, communication: 5,
            comment: REVIEW_TEXT[(n + j) % REVIEW_TEXT.length], createdAt: replyAt,
          },
          update: {},
        });
      }
      const agg = await prisma.review.aggregate({ where: { providerId: provider.id, status: 'VISIBLE' }, _avg: { overall: true }, _count: { _all: true } });
      await prisma.providerProfile.update({
        where: { id: provider.id },
        data: { ratingAvg: Math.round((agg._avg.overall ?? 0) * 100) / 100, ratingCount: agg._count._all },
      });
    }
  }
}

export async function seedAll() {
  await seedCatalog();
  await seedAdmin();
  if (process.env.SEED_DEMO === 'true') await seedDemo();
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  seedAll()
    .then(() => logger.info('seed complete'))
    .catch((e) => {
      logger.error({ err: e }, 'seed failed');
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
