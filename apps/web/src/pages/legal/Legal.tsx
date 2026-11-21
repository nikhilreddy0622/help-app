import { Link, useParams } from 'react-router-dom';
import { LEGAL_DOCS } from '@help/domain';
import { Seo } from '../../components/ui/Seo';
import { EmptyState } from '../../components/ui/States';
import { LinkButton } from '../../components/ui/Button';

export default function Legal() {
  const { doc = '' } = useParams();
  const page = LEGAL_DOCS[doc as keyof typeof LEGAL_DOCS];
  if (!page) return <div className="container-page py-12"><Seo title="Page not found" noindex /><EmptyState title="Page not found" action={<LinkButton to="/">Go home</LinkButton>} /></div>;
  return (
    <div className="container-page max-w-3xl py-10 md:py-14">
      <Seo title={page.title} description={page.intro} path={`/legal/${doc}`} />
      <h1 className="text-3xl md:text-4xl">{page.title}</h1>
      <p className="mt-3 text-lg text-subtle">{page.intro}</p>
      <p className="mt-2 text-sm text-muted">Last updated {page.updated}</p>
      {page.sections.map((s) => (
        <section key={s.h} className="mt-8">
          <h2 className="text-xl">{s.h}</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{s.p}</p>
        </section>
      ))}
      <nav aria-label="Other policies" className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-6 text-sm">
        {Object.entries(LEGAL_DOCS).filter(([k]) => k !== doc).map(([k, p]) => <Link key={k} to={`/legal/${k}`} className="font-semibold">{p.title}</Link>)}
        <Link to="/delete-account" className="font-semibold">Delete your account</Link>
      </nav>
    </div>
  );
}
