import type { ProviderCard, ProviderPublicProfile } from '@help/types';

export function profileJsonLd(p: ProviderPublicProfile, origin: string) {
  const url = `${origin}/professionals/${p.slug}`;
  const business: Record<string, unknown> = {
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': `${url}#business`,
    name: p.displayName,
    description: p.headline,
    url,
    image: p.avatarUrl ?? undefined,
    areaServed: p.areasServed.length ? p.areasServed : p.locality ?? undefined,
    address: p.locality ? { '@type': 'PostalAddress', addressLocality: p.locality, addressCountry: 'IN' } : undefined,
    makesOffer: p.services.slice(0, 10).map((s) => ({
      '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title }, priceCurrency: 'INR', price: s.pricePaise / 100,
    })),
  };
  if (p.ratingAvg !== null && p.ratingCount > 0) {
    business.aggregateRating = { '@type': 'AggregateRating', ratingValue: p.ratingAvg, reviewCount: p.ratingCount, bestRating: 5, worstRating: 1 };
    business.review = p.recentReviews.slice(0, 5).map((r) => ({
      '@type': 'Review', author: { '@type': 'Person', name: r.authorName }, datePublished: r.createdAt.slice(0, 10), reviewBody: r.comment ?? undefined,
      reviewRating: { '@type': 'Rating', ratingValue: r.overall, bestRating: 5 },
    }));
  }
  const person = {
    '@type': 'Person', '@id': `${url}#person`, name: p.displayName, jobTitle: p.categoryName, image: p.avatarUrl ?? undefined,
    knowsLanguage: p.languages, knowsAbout: p.skills, worksFor: { '@id': `${url}#business` },
  };
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [business, person] });
}

export function listJsonLd(name: string, items: ProviderCard[], origin: string) {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList', name,
    itemListElement: items.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${origin}/professionals/${p.slug}`, name: p.displayName })),
  });
}
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[], origin: string) {
  return JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: `${origin}${c.path}` })),
  });
}
