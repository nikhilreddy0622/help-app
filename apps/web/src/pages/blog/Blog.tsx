import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { POSTS, postBySlug, type Block, type Post } from '../../content/blog';
import { Seo } from '../../components/ui/Seo';
import { LinkButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/States';
import { formatDate } from '../../lib/format';
import { breadcrumbJsonLd } from '../../lib/jsonld';
import { useSite } from '../../state/SiteContext';

function Meta({ p }: { p: Post }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      <span className="font-semibold text-teal-800">{p.tag}</span><span aria-hidden>·</span>
      <time dateTime={p.date}>{formatDate(p.date)}</time><span aria-hidden>·</span>
      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{p.readMins} min read</span>
    </p>
  );
}

export function PostCard({ p }: { p: Post }) {
  return (
    <li>
      <Link to={`/blog/${p.slug}`} className="card flex h-full flex-col gap-2 p-5 transition-shadow hover:shadow-md">
        <Meta p={p} />
        <h3 className="text-lg font-semibold leading-snug text-navy">{p.title}</h3>
        <p className="text-sm text-subtle">{p.description}</p>
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-teal-800">Read<ArrowRight className="h-4 w-4" aria-hidden /></span>
      </Link>
    </li>
  );
}

export function BlogIndex() {
  const { origin } = useSite();
  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Blog', name: 'help blog', url: `${origin}/blog`,
    blogPost: POSTS.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${origin}/blog/${p.slug}`, datePublished: p.date })),
  });
  return (
    <div className="container-page py-10 md:py-14">
      <Seo title="Blog: tips for hiring local professionals" description="Practical guides on hiring electricians, tutors and other local professionals in India, staying safe at home, and growing your local business." path="/blog" jsonLd={[ld]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">The help blog</h1>
        <p className="mt-2 text-subtle md:text-lg">Plain advice on finding good local help — and on being the professional people want to call.</p>
      </header>
      <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{POSTS.map((p) => <PostCard key={p.slug} p={p} />)}</ul>
    </div>
  );
}

function Body({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mt-8 space-y-4 text-[17px] leading-relaxed text-ink">
      {blocks.map((b, i) => {
        if ('h2' in b) return <h2 key={i} className="pt-4 text-xl font-bold tracking-tight text-navy">{b.h2}</h2>;
        if ('ul' in b) return <ul key={i} className="list-disc space-y-2 pl-5">{b.ul.map((x) => <li key={x}>{x}</li>)}</ul>;
        return <p key={i}>{b.p}</p>;
      })}
    </div>
  );
}

export function BlogPost() {
  const { slug = '' } = useParams();
  const { origin } = useSite();
  const p = postBySlug(slug);
  if (!p) {
    return (
      <div className="container-page py-12">
        <Seo title="Article not found" noindex />
        <EmptyState title="We could not find that article" text="It may have moved. Browse the latest articles instead." action={<LinkButton to="/blog">Go to the blog</LinkButton>} />
      </div>
    );
  }
  const url = `${origin}/blog/${p.slug}`;
  const article = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description,
    datePublished: p.date, dateModified: p.date, mainEntityOfPage: url, url, image: `${origin}/og-default.png`,
    author: { '@type': 'Organization', name: 'help', url: origin },
    publisher: { '@type': 'Organization', name: 'help', logo: { '@type': 'ImageObject', url: `${origin}/icon-512.png` } },
  });
  const crumbs = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: p.title, path: `/blog/${p.slug}` }], origin);
  const more = POSTS.filter((x) => x.slug !== p.slug).slice(0, 3);
  return (
    <div className="container-page py-10 md:py-14">
      <Seo title={p.title} description={p.description} path={`/blog/${p.slug}`} type="article" jsonLd={[article, crumbs]} />
      <article className="mx-auto max-w-2xl">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800"><ArrowLeft className="h-4 w-4" aria-hidden />All articles</Link>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">{p.title}</h1>
        <div className="mt-3"><Meta p={p} /></div>
        <Body blocks={p.body} />
        {p.cta && <div className="mt-10 rounded-xl bg-teal-tint p-6"><p className="font-semibold text-teal-800">Ready when you are</p><LinkButton to={p.cta.to} className="mt-3">{p.cta.label}</LinkButton></div>}
      </article>
      <section className="mx-auto mt-14 max-w-6xl" aria-labelledby="more">
        <h2 id="more" className="mb-4 text-xl font-bold tracking-tight">Keep reading</h2>
        <ul className="grid gap-4 md:grid-cols-3">{more.map((x) => <PostCard key={x.slug} p={x} />)}</ul>
      </section>
    </div>
  );
}
