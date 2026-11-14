import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useMyProvider } from '../../lib/hooks';
import { Seo } from '../../components/ui/Seo';
import { QueryBoundary, SkeletonList } from '../../components/ui/States';
import { RequireAuth } from '../../components/layout/AreaLayout';
import { STEPS, StepRenderer } from '../../components/onboarding/steps';
import { Button } from '../../components/ui/Button';

function Inner() {
  const q = useMyProvider();
  const { refreshMe } = useAuth();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  return (
    <QueryBoundary query={q} skeleton={<div className="container-page py-8"><SkeletonList rows={3} height="h-32" /></div>}>
      {(mine) => {
        const maxAllowed = mine ? STEPS.length - 1 : 1;
        const step = Math.min(Math.max((Number(sp.get('step') ?? 1) || 1) - 1, 0), maxAllowed);
        const go = (i: number) => setSp({ step: String(i + 1) }, { replace: true });
        const next = () => {
          void refreshMe();
          if (step >= STEPS.length - 1) nav('/pro', { replace: true }); else go(step + 1);
        };
        return (
          <div className="container-page grid gap-6 py-6 lg:grid-cols-[280px_1fr] lg:py-10">
            <Seo title="Set up your professional profile" noindex />
            <nav aria-label="Onboarding steps" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
              <ol className="flex gap-2 lg:flex-col">
                {STEPS.map((s, i) => {
                  const enabled = i <= maxAllowed;
                  const done = i < step;
                  return (
                    <li key={s.id} className="flex-none">
                      <button type="button" disabled={!enabled} aria-current={i === step ? 'step' : undefined} onClick={() => go(i)}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left disabled:opacity-50 ${i === step ? 'bg-teal-tint' : 'hover:bg-surface'}`}>
                        <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-semibold ${done ? 'bg-teal-700 text-white' : i === step ? 'border-2 border-teal-700 text-teal-800' : 'border border-line-strong text-subtle'}`}>{done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}</span>
                        <span className="hidden min-w-0 lg:block"><span className="block truncate text-sm font-semibold text-navy">{s.title}</span><span className="block truncate text-xs text-subtle">{s.desc}</span></span>
                        <span className="text-sm font-semibold text-navy lg:hidden">{i === step ? s.title : ''}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
            <div className="min-w-0">
              <p className="text-sm font-medium text-subtle">Step {step + 1} of {STEPS.length}</p>
              <h1 className="mb-1 text-2xl font-bold tracking-tight">{STEPS[step]?.title}</h1>
              <p className="mb-6 text-sm text-subtle">Your progress is saved as a draft after each step. Drafts are free and private.</p>
              <div className="card p-5 md:p-6"><StepRenderer index={step} mine={mine} done={next} cta={step === STEPS.length - 1 ? 'Finish' : undefined} /></div>
              {step > 0 && <Button variant="ghost" className="mt-4" onClick={() => go(step - 1)}>Back</Button>}
            </div>
          </div>
        );
      }}
    </QueryBoundary>
  );
}
export default function Onboarding() { return <RequireAuth><Inner /></RequireAuth>; }
