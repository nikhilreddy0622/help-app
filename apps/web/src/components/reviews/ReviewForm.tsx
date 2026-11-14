import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { errorMessage, useApi } from '../../lib/api';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Field';

const KEYS = [['overall', 'Overall'], ['quality', 'Quality of work'], ['behaviour', 'Behaviour'], ['punctuality', 'Punctuality'], ['value', 'Value for money'], ['communication', 'Communication']] as const;
type K = (typeof KEYS)[number][0];

function StarInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center justify-between gap-3">
      <span className="text-sm text-navy">{label}</span>
      <div className="flex">{[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded p-1.5">
          <Star className={`h-6 w-6 ${n <= value ? 'fill-warning text-warning' : 'text-line-strong'}`} aria-hidden />
        </button>))}
      </div>
    </div>
  );
}

/** Review of a professional you contacted through help. */
export function ReviewForm({ providerId, onDone }: { providerId: string; onDone?: () => void }) {
  const api = useApi();
  const qc = useQueryClient();
  const [v, setV] = useState<Record<K, number>>({ overall: 0, quality: 0, behaviour: 0, punctuality: 0, value: 0, communication: 0 });
  const [comment, setComment] = useState('');
  const m = useMutation({
    mutationFn: () => api.reviews.create({ providerId, ...v, comment: comment || undefined }),
    onSuccess: () => { for (const k of ['eligibility', 'profile', 'reviews', 'conversations']) void qc.invalidateQueries({ queryKey: [k] }); onDone?.(); },
  });
  const ready = Object.values(v).every((n) => n > 0);
  if (m.isSuccess) return <p role="status" className="rounded-md bg-success-bg p-3 text-sm font-medium text-success-fg">Thanks. Your review is published.</p>;
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      {KEYS.map(([k, l]) => <StarInput key={k} label={l} value={v[k]} onChange={(n) => setV((o) => ({ ...o, [k]: n }))} />)}
      <Textarea label="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
      {m.isError && <p role="alert" className="text-sm font-medium text-danger">{errorMessage(m.error)}</p>}
      <Button type="submit" disabled={!ready} loading={m.isPending}>Submit review</Button>
    </form>
  );
}
