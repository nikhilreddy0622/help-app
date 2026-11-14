import { formatINR } from '@help/api-client';

export { formatINR };

export const fmtDate = (v: unknown): string => {
  if (typeof v !== 'string' && typeof v !== 'number') return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
export const fmtDay = (v: unknown): string => {
  if (typeof v !== 'string' && typeof v !== 'number') return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const str = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};
export const get = (r: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    const parts = k.split('.');
    let cur: unknown = r;
    for (const p of parts) cur = cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[p] : undefined;
    if (cur !== undefined && cur !== null && cur !== '') return cur;
  }
  return undefined;
};
export const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' && !isNaN(Number(v)) ? Number(v) : undefined);
export const humanize = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
