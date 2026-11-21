/**
 * Imports the master service catalog (infrastructure/database/catalog.json):
 * main categories become groups, services become their children. Idempotent (keyed by catalogId / slug).
 * Legacy categories are mapped onto catalog services — their providers, offerings and jobs move across — then deactivated.
 * Usage: pnpm --filter @help/api exec tsx --env-file-if-exists=.env src/scripts/import-catalog.ts [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from '@help/domain';
import { prisma } from '../lib/core';

interface Row { id: string; main: string; sub: string; service: string; providerType: string; keywords: string[] }

const here = path.dirname(fileURLToPath(import.meta.url));
const rows: Row[] = JSON.parse(fs.readFileSync(path.resolve(here, '../../../../infrastructure/database/catalog.json'), 'utf8'));
const dry = process.argv.includes('--dry');

// Most-used first; the rest follow alphabetically.
const PRIORITY = ['Home Services', 'Education', 'Repair & Electronics', 'Automotive', 'Beauty & Personal Care', 'Health & Wellness', 'Construction',
  'Events & Entertainment', 'Food & Catering', 'Photography & Creative', 'Transportation', 'IT & Software', 'Business & Professional',
  'Legal & Documentation', 'Pet & Animal', 'Fashion & Tailoring', 'Garden & Outdoor', 'Real Estate', 'Agriculture'];

const ICON: Record<string, string> = {
  'Accessibility': 'accessibility', 'Agriculture': 'sprout', 'Architecture & Engineering': 'drafting-compass', 'Automotive': 'car',
  'Aviation & Drones': 'plane', 'Beauty & Personal Care': 'scissors', 'Business & Professional': 'briefcase', 'Career & Employment': 'target',
  'Child Development': 'baby', 'Claims & Recovery': 'file-check', 'Construction': 'hard-hat', 'Corporate Events': 'presentation',
  'Digital Commerce': 'shopping-cart', 'Digital Marketing': 'megaphone', 'Disaster & Restoration': 'life-buoy', 'Education': 'graduation-cap',
  'Emerging Technology': 'cpu', 'Energy & Renewable': 'sun', 'Environmental': 'leaf', 'Events & Entertainment': 'party-popper',
  'Facility Management': 'building', 'Fashion & Tailoring': 'shirt', 'Finance & Insurance': 'landmark', 'Food & Catering': 'chef-hat',
  'Funeral & Memorial': 'flower-2', 'Garden & Outdoor': 'trees', 'Handicrafts & Artisans': 'palette', 'Health & Wellness': 'heart-pulse',
  'Heritage & Conservation': 'castle', 'Home Services': 'home', 'Hospitality': 'hotel', 'IT & Software': 'monitor', 'Industrial': 'factory',
  'Industrial Testing': 'flask-conical', 'Language & Communication': 'languages', 'Legal & Documentation': 'scale',
  'Logistics & Warehousing': 'warehouse', 'Marine & Fisheries': 'fish', 'Media & Broadcasting': 'radio', 'Mining & Quarry': 'pickaxe',
  'Office Support': 'printer', 'Packaging': 'package', 'Personal Assistance': 'user-check', 'Pet & Animal': 'paw-print',
  'Photography & Creative': 'camera', 'Property Development': 'building-2', 'Real Estate': 'key-round', 'Rental & Equipment': 'forklift',
  'Repair & Electronics': 'wrench', 'Research & Data': 'database', 'Scientific & Technical': 'microscope', 'Security & Safety': 'shield-check',
  'Senior & Accessibility Services': 'hand-heart', 'Smart Home': 'lightbulb', 'Specialised Services': 'sparkles', 'Sports & Adventure': 'trophy',
  'Telecom & Connectivity': 'wifi', 'Telecom Infrastructure': 'radio-tower', 'Textile & Garment': 'ruler', 'Traditional & Cultural': 'drum',
  'Traditional Trades': 'hammer', 'Transportation': 'truck', 'Travel & Tourism': 'luggage', 'Water & Sanitation': 'droplets',
};

// Legacy (seed) category slug -> catalog service id.
const LEGACY: Record<string, string> = {
  plumbers: 'SVC-0006', electricians: 'SVC-0001', carpenters: 'SVC-0011', painters: 'SVC-0015', cleaning: 'SVC-0017', 'pest-control': 'SVC-0021',
  'appliance-repair': 'SVC-0024', tutors: 'SVC-0045', 'music-teachers': 'SVC-0063', 'language-classes': 'SVC-0051', coaching: 'SVC-0054',
  mechanics: 'SVC-0068', drivers: 'SVC-0080', 'car-wash': 'SVC-0073', 'bike-repair': 'SVC-0069', 'yoga-trainers': 'SVC-0104',
  'gym-trainers': 'SVC-0103', physiotherapists: 'SVC-0108', dietitians: 'SVC-0106', photographers: 'SVC-0116', videographers: 'SVC-0118',
  'photo-editing': 'SVC-0119', 'mobile-repair': 'SVC-0250', 'laptop-repair': 'SVC-0251', 'ac-repair': 'SVC-0023', 'furniture-repair': 'SVC-0012',
  masons: 'SVC-0030', contractors: 'SVC-0029', 'interior-designers': 'SVC-0043', architects: 'SVC-0032', accountants: 'SVC-0166',
  'legal-advisors': 'SVC-0170', consultants: 'SVC-0171', marketing: 'SVC-0190', 'web-developers': 'SVC-0176', 'app-developers': 'SVC-0177',
  'it-support': 'SVC-0185', 'graphic-designers': 'SVC-0120', gardeners: 'SVC-0154', 'farm-labour': 'SVC-0147', landscaping: 'SVC-0217',
  'event-planners': 'SVC-0127', decorators: 'SVC-0128', caterers: 'SVC-0129', djs: 'SVC-0130',
};

async function main() {
  const mains = [...new Set(rows.map((r) => r.main))];
  const order = (m: string) => (PRIORITY.includes(m) ? PRIORITY.indexOf(m) : PRIORITY.length + mains.filter((x) => !PRIORITY.includes(x)).sort().indexOf(m));
  const missingIcon = mains.filter((m) => !ICON[m]);
  if (missingIcon.length) throw new Error(`No icon for: ${missingIcon.join(', ')}`);

  const groupId = new Map<string, string>();
  for (const m of mains) {
    const slug = slugify(m);
    const data = { name: m, icon: ICON[m]!, parentId: null, isActive: true, sortOrder: order(m) };
    if (dry) { groupId.set(m, `dry:${slug}`); continue; }
    const g = await prisma.category.upsert({ where: { slug }, create: { slug, ...data }, update: data });
    groupId.set(m, g.id);
  }

  const used = new Set<string>(mains.map((m) => slugify(m)));
  const svcId = new Map<string, string>();
  let i = 0;
  for (const r of rows) {
    const existing = dry ? null : await prisma.category.findUnique({ where: { catalogId: r.id }, select: { id: true, slug: true } });
    let slug = existing?.slug ?? slugify(r.service);
    if (!existing && used.has(slug)) slug = slugify(r.service, r.main);
    used.add(slug);
    const data = { name: r.service, parentId: groupId.get(r.main)!, subgroup: r.sub, keywords: r.keywords, isActive: true, sortOrder: i++ };
    if (dry) { svcId.set(r.id, `dry:${slug}`); continue; }
    const clash = existing ? null : await prisma.category.findUnique({ where: { slug }, select: { id: true, catalogId: true } });
    const c = existing
      ? await prisma.category.update({ where: { id: existing.id }, data })
      : clash && !clash.catalogId
        ? await prisma.category.update({ where: { id: clash.id }, data: { ...data, catalogId: r.id } })
        : await prisma.category.create({ data: { ...data, slug, catalogId: r.id } });
    svcId.set(r.id, c.id);
  }

  let moved = 0;
  for (const [legacySlug, target] of Object.entries(LEGACY)) {
    const legacy = dry ? null : await prisma.category.findUnique({ where: { slug: legacySlug }, select: { id: true, catalogId: true } });
    const to = svcId.get(target);
    if (!legacy || !to || legacy.catalogId || legacy.id === to) continue;
    const [p, s, j] = await prisma.$transaction([
      prisma.providerProfile.updateMany({ where: { primaryCategoryId: legacy.id }, data: { primaryCategoryId: to } }),
      prisma.serviceOffering.updateMany({ where: { categoryId: legacy.id }, data: { categoryId: to } }),
      prisma.jobPosting.updateMany({ where: { categoryId: legacy.id }, data: { categoryId: to } }),
      prisma.category.update({ where: { id: legacy.id }, data: { isActive: false } }),
    ]);
    moved += p.count + s.count + j.count;
  }

  // Any remaining non-catalog category (legacy groups such as "Repairs") is retired.
  const retired = dry ? { count: 0 } : await prisma.category.updateMany({
    where: { catalogId: null, isActive: true, NOT: { slug: { in: mains.map((m) => slugify(m)) } } },
    data: { isActive: false },
  });

  console.log(JSON.stringify({ dry, groups: mains.length, services: rows.length, recordsMoved: moved, retiredCategories: retired.count }));
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
