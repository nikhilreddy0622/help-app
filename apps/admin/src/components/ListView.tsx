import { useEffect, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { AdminRow } from '@help/api-client';
import { useList } from '../lib/useList';
import { Button, Card, EmptyState, ErrorState, Input, Select, TableSkeleton } from './ui';

export interface Column { header: string; cell: (r: AdminRow) => ReactNode; className?: string }
export interface FilterDef { name: string; label: string; options?: { value: string; label: string }[]; type?: 'text' | 'date' }
type Fetcher = Parameters<typeof useList>[1];

export function useDebounced<T>(v: T, ms = 350): T {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

interface Props {
  id: string;
  fetcher: Fetcher;
  columns: Column[];
  filters?: FilterDef[];
  search?: string; // placeholder; when set shows a search box sent as `q`
  fixedParams?: Record<string, string | number | boolean | undefined>;
  initialFilters?: Record<string, string>;
  actions?: (r: AdminRow) => ReactNode;
  onRowClick?: (r: AdminRow) => void;
  toolbarExtra?: ReactNode;
  footer?: (rows: AdminRow[]) => ReactNode;
  emptyTitle?: string;
}

export function ListView({ id, fetcher, columns, filters = [], search, fixedParams, initialFilters, actions, onRowClick, toolbarExtra, footer, emptyTitle }: Props) {
  const [q, setQ] = useState('');
  const [f, setF] = useState<Record<string, string>>(initialFilters ?? {});
  const dq = useDebounced(q);
  const df = useDebounced(f, 300);
  const params = { ...fixedParams, ...df, ...(dq ? { q: dq } : {}) };
  const list = useList(id, fetcher, params);
  const colCount = columns.length + (actions ? 1 : 0);

  return (
    <Card>
      {(search || filters.length > 0 || toolbarExtra) && (
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
          {search && (
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" aria-hidden />
              <Input aria-label="Search" type="search" placeholder={search} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          )}
          {filters.map((fd) => (
            <div key={fd.name} className="w-44">
              {fd.type ? (
                <Input aria-label={fd.label} type={fd.type} placeholder={fd.label} value={f[fd.name] ?? ''} onChange={(e) => setF((p) => ({ ...p, [fd.name]: e.target.value }))} />
              ) : (
                <Select aria-label={fd.label} value={f[fd.name] ?? ''} onChange={(e) => setF((p) => ({ ...p, [fd.name]: e.target.value }))}>
                  <option value="">{fd.label}: all</option>
                  {(fd.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              )}
            </div>
          ))}
          {toolbarExtra}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-slate-50 text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => <th key={c.header} scope="col" className={`px-4 py-3 font-semibold ${c.className ?? ''}`}>{c.header}</th>)}
              {actions && <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          {!list.isPending && !list.isError && (
            <tbody className="divide-y divide-line">
              {list.rows.map((r) => (
                <tr key={r.id} className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                  {columns.map((c, i) => (
                    <td key={c.header} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                      {onRowClick && i === 0 ? (
                        <button type="button" className="text-left font-medium text-teal-700 hover:underline" onClick={(e) => { e.stopPropagation(); onRowClick(r); }}>{c.cell(r)}</button>
                      ) : c.cell(r)}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}><div className="flex justify-end gap-2">{actions(r)}</div></td>}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      {list.isPending && <TableSkeleton cols={Math.min(colCount, 6)} />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {!list.isPending && !list.isError && list.rows.length === 0 && <EmptyState title={emptyTitle ?? 'No results'} hint="Try changing your search or filters." />}
      {footer && !list.isPending && !list.isError && list.rows.length > 0 && <div className="border-t border-line bg-slate-50 px-4 py-3 text-sm">{footer(list.rows)}</div>}
      {list.hasNextPage && (
        <div className="flex justify-center border-t border-line p-4">
          <Button onClick={() => void list.fetchNextPage()} loading={list.isFetchingNextPage}>Load more</Button>
        </div>
      )}
    </Card>
  );
}
