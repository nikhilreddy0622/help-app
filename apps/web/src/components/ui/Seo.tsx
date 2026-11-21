import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSite } from '../../state/SiteContext';
import { useUnread } from '../../state/RealtimeContext';

interface Props { title: string; description?: string; path?: string; noindex?: boolean; image?: string | null; type?: string; jsonLd?: string[] }

export function Seo({ title, description, path, noindex, image, type = 'website', jsonLd = [] }: Props) {
  const { origin } = useSite();
  const { count } = useUnread();
  const base = title === 'help' ? title : `${title} · help`;
  const full = count > 0 ? `(${count > 99 ? '99+' : count}) ${base}` : base;
  const url = path !== undefined ? `${origin}${path}` : undefined;
  // react-helmet-async does not reliably update the title on client navigation under React 19.
  useEffect(() => { document.title = full; }, [full]);
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      {url && !noindex && <link rel="canonical" href={url} />}
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={image ?? `${origin}/og-default.png`} />
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      {jsonLd.map((j, i) => <script key={i} type="application/ld+json">{j}</script>)}
    </Helmet>
  );
}
