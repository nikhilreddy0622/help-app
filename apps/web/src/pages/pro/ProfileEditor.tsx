import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { useMyProvider } from '../../lib/hooks';
import { QueryBoundary, SkeletonList } from '../../components/ui/States';
import { Seo } from '../../components/ui/Seo';
import { STEPS, StepRenderer } from '../../components/onboarding/steps';
import { Chip } from '../../components/ui/Field';

export default function ProfileEditor() {
  const q = useMyProvider();
  const [i, setI] = useState(0);
  const [saved, setSaved] = useState(false);
  const sections = STEPS.filter((s) => s.id !== 'preview');
  return (
    <div>
      <Seo title="Edit profile" noindex />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <QueryBoundary query={q} skeleton={<span />}>{(m) => m ? <Link to={`/professionals/${m.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold">View public page<ExternalLink className="h-4 w-4" aria-hidden /></Link> : null}</QueryBoundary>
      </div>
      <div role="group" aria-label="Profile sections" className="mb-5 flex gap-2 overflow-x-auto pb-1">{sections.map((s, n) => <Chip key={s.id} active={n === i} onClick={() => { setI(n); setSaved(false); }}>{s.title}</Chip>)}</div>
      {saved && <p role="status" className="mb-4 rounded-md bg-success-bg p-3 text-sm font-medium text-success-fg">Saved. Changes are live on your profile.</p>}
      <QueryBoundary query={q} skeleton={<SkeletonList rows={3} height="h-32" />}>
        {(mine) => <div className="card p-5 md:p-6"><StepRenderer index={i} mine={mine} cta="Save changes" done={() => setSaved(true)} /></div>}
      </QueryBoundary>
    </div>
  );
}
