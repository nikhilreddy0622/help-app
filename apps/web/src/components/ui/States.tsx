import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button';
import { errorMessage } from '../../lib/api';

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skeleton ${className}`} aria-hidden />;

export function SkeletonList({ rows = 3, height = 'h-24' }: { rows?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={`${height} w-full`} />)}
    </div>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-white px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-tint text-teal">{icon ?? <Inbox className="h-6 w-6" aria-hidden />}</span>
      <h3 className="text-base font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-subtle">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: { error?: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-bg text-danger"><AlertCircle className="h-6 w-6" aria-hidden /></span>
      <h3 className="text-base font-semibold">{title}</h3>
      {error !== undefined && <p className="max-w-sm text-sm text-subtle">{errorMessage(error)}</p>}
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** One place for loading / error-with-retry / empty / data. */
export function QueryBoundary<T>({ query, skeleton, isEmpty, empty, children }: {
  query: UseQueryResult<T>;
  skeleton?: ReactNode;
  isEmpty?: (d: T) => boolean;
  empty?: ReactNode;
  children: (d: T) => ReactNode;
}) {
  if (query.isPending) return <>{skeleton ?? <SkeletonList />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (isEmpty?.(query.data)) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  return <>{children(query.data)}</>;
}
