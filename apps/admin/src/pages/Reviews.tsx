import { Star } from 'lucide-react';
import { api } from '../lib/api';
import { get, humanize, num, str } from '../lib/format';
import { Button, PageHeader, useActions } from '../components/ui';
import { ListView } from '../components/ListView';
import { col } from '../components/cols';

type S = 'VISIBLE' | 'HIDDEN' | 'REMOVED';

export function Reviews() {
  const { run } = useActions();
  const moderate = (id: string, status: S) =>
    run(
      {
        title: status === 'VISIBLE' ? 'Restore review' : status === 'HIDDEN' ? 'Hide review' : 'Remove review',
        description: status === 'VISIBLE' ? 'The review will be visible on the provider profile again.' : status === 'HIDDEN' ? 'The review will be hidden from public view and can be restored later.' : 'The review will be removed from public view and from rating calculations.',
        confirmLabel: status === 'VISIBLE' ? 'Restore' : status === 'HIDDEN' ? 'Hide' : 'Remove', danger: status !== 'VISIBLE', noteLabel: 'Moderation note', noteRequired: status !== 'VISIBLE',
        success: status === 'VISIBLE' ? 'Review restored' : status === 'HIDDEN' ? 'Review hidden' : 'Review removed',
      },
      (n) => api.admin.moderateReview(id, status, n || undefined),
    );
  return (
    <>
      <PageHeader title="Review moderation" subtitle="Hide or remove reviews that break the guidelines" />
      <ListView
        id="reviews"
        fetcher={(q) => api.admin.reviews(q)}
        search="Search review text"
        filters={[{ name: 'status', label: 'Status', options: (['VISIBLE', 'HIDDEN', 'REMOVED'] as S[]).map((v) => ({ value: v, label: humanize(v) })) }]}
        columns={[
          { header: 'Rating', cell: (r) => { const n = num(get(r, 'rating')); return n === undefined ? '-' : <span className="inline-flex items-center gap-1 tabular-nums"><Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />{n}<span className="sr-only"> out of 5</span></span>; } },
          { header: 'Review', className: 'max-w-md', cell: (r) => <p className="line-clamp-3 whitespace-pre-wrap">{str(get(r, 'comment', 'text', 'body'))}</p> },
          col.text('Customer', 'customer.name', 'customerName', 'author.name'),
          col.text('Provider', 'provider.displayName', 'providerName'),
          col.status(), col.date(),
        ]}
        actions={(r) => {
          const s = String(get(r, 'status'));
          return (
            <>
              {s !== 'VISIBLE' && <Button size="sm" onClick={() => moderate(r.id, 'VISIBLE')}>Restore</Button>}
              {s === 'VISIBLE' && <Button size="sm" onClick={() => moderate(r.id, 'HIDDEN')}>Hide</Button>}
              {s !== 'REMOVED' && <Button size="sm" variant="danger" onClick={() => moderate(r.id, 'REMOVED')}>Remove</Button>}
            </>
          );
        }}
      />
    </>
  );
}
