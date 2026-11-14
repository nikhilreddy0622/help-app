import type { MyProvider } from '@help/api-client';
import { StepBasics, StepLocation, StepProfession } from './StepsA';
import { StepAvailability, StepPortfolio, StepServices, StepVerification } from './StepsB';
import { StepPreview } from './StepPreview';

export const STEPS = [
  { id: 'basics', title: 'Basics', desc: 'Name, photo and about you', Comp: StepBasics },
  { id: 'profession', title: 'Profession and skills', desc: 'What you do', Comp: StepProfession },
  { id: 'location', title: 'Location and radius', desc: 'Where you work', Comp: StepLocation },
  { id: 'services', title: 'Services and pricing', desc: 'What you charge', Comp: StepServices },
  { id: 'availability', title: 'Weekly availability', desc: 'When you work', Comp: StepAvailability },
  { id: 'portfolio', title: 'Portfolio', desc: 'Photos of your work', Comp: StepPortfolio },
  { id: 'verification', title: 'Verification', desc: 'Build trust with badges', Comp: StepVerification },
  { id: 'preview', title: 'Preview and plan', desc: 'Go live', Comp: StepPreview },
] as const;

export function StepRenderer({ index, mine, done, cta }: { index: number; mine: MyProvider | null; done: () => void; cta?: string }) {
  const s = STEPS[index];
  if (!s) return null;
  return <s.Comp key={s.id} mine={mine} done={done} cta={cta} />;
}
