import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Inbox, X, XCircle } from 'lucide-react';
import { errMsg, handleAuthError } from '../lib/api';
import { humanize } from '../lib/format';

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(' ');

/* ---------- Button ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md'; loading?: boolean };
export function Button({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...p }: BtnProps) {
  const v = {
    primary: 'bg-brand text-white hover:bg-brand-deep border-transparent shadow-sm',
    secondary: 'bg-white text-ink border-line hover:bg-slate-50',
    danger: 'bg-danger text-white border-transparent hover:bg-red-800',
    ghost: 'bg-transparent text-subtle border-transparent hover:bg-slate-100',
  }[variant];
  return (
    <button type="button" {...p} disabled={disabled || loading} className={cx('inline-flex items-center justify-center gap-2 rounded border font-semibold transition-[background-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50', size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm', v, className)}>
      {children}
    </button>
  );
}

/* ---------- Fields ---------- */
export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-subtle">{label}</label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
const inputCls = 'h-10 w-full rounded border border-line bg-white px-3 transition-colors focus:border-brand text-sm text-ink placeholder:text-muted disabled:bg-slate-50';
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, 'h-auto py-2', p.className)} />;

/* ---------- Badge ---------- */
const tone: Record<string, string> = {
  green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-sky-100 text-sky-800', slate: 'bg-slate-100 text-slate-700', teal: 'bg-teal-50 text-teal-800',
};
const statusTone = (s: string): string => {
  const u = s.toUpperCase();
  if (/(FAILED|REJECTED|REMOVED|SUSPENDED|HALTED|DISPUTED|CANCELLED|EXPIRED)/.test(u)) return 'red';
  if (/(PENDING|PAST_DUE|OPEN|REQUESTED|HIDDEN|DRAFT|PROPOSED|CREATED)/.test(u)) return 'amber';
  if (/(ACTIVE|PUBLISHED|APPROVED|VISIBLE|COMPLETED|CAPTURED|PAID|RESOLVED|SUCCESS)/.test(u)) return 'green';
  if (/(PROGRESS|ACCEPTED)/.test(u)) return 'blue';
  return 'slate';
};
export function Badge({ children, color }: { children: ReactNode; color?: keyof typeof tone }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold', tone[color ?? 'slate'])}>{children}</span>;
}
export const StatusBadge = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value ? <Badge color={statusTone(value)}>{humanize(value)}</Badge>
    : typeof value === 'boolean' ? <Badge color={value ? 'green' : 'slate'}>{value ? 'Yes' : 'No'}</Badge>
    : <span className="text-muted">-</span>;

/* ---------- Skeleton / states ---------- */
export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cx('animate-pulse rounded bg-slate-200', className)} />;
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">{Array.from({ length: cols }).map((__, j) => <Skeleton key={j} className="h-4 flex-1" />)}</div>
      ))}
    </div>
  );
}
export function EmptyState({ title = 'Nothing here yet', hint }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Inbox className="h-8 w-8 text-muted" aria-hidden />
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden />
      <p className="text-sm text-ink">{errMsg(error)}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );
}

/* ---------- Layout bits ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('rounded-lg border border-line/70 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]', className)}>{children}</div>;
export function Notice({ children, tone: t = 'amber' }: { children: ReactNode; tone?: 'amber' | 'blue' }) {
  return (
    <div role="note" className={cx('flex gap-2 rounded border px-3 py-2 text-sm', t === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-sky-900')}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><div>{children}</div>
    </div>
  );
}

/* ---------- Modal / Drawer ---------- */
function useDialogBehaviour(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])') ?? ref.current;
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && ref.current) {
        const els = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea');
        if (!els.length) return;
        const f = els[0]!, l = els[els.length - 1]!;
        if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
        else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [open]);
  return ref;
}

export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useDialogBehaviour(open, onClose);
  const tid = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1} className="max-h-[90vh] w-full max-w-md overflow-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id={tid} className="text-lg font-semibold">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="Close dialog" className="rounded p-1 text-muted hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4 px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useDialogBehaviour(open, onClose);
  const tid = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside ref={ref} role="dialog" aria-modal="true" aria-labelledby={tid} tabIndex={-1} className="slidein absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id={tid} className="text-lg font-semibold">{title}</h2>
          <button type="button" data-close onClick={onClose} aria-label="Close panel" className="rounded p-1 text-muted hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto px-6 py-4">{children}</div>
      </aside>
    </div>
  );
}

/* ---------- Toasts + confirm-run ---------- */
interface ToastItem { id: number; kind: 'success' | 'error'; msg: string }
export interface RunOpts { title: string; description?: ReactNode; confirmLabel?: string; danger?: boolean; noteLabel?: string; noteRequired?: boolean; success: string }
interface ActionCtxValue { toast(kind: ToastItem['kind'], msg: string): void; run(o: RunOpts, fn: (note: string) => Promise<unknown>): void }
const ActionCtx = createContext<ActionCtxValue | null>(null);
export const useActions = () => { const c = useContext(ActionCtx); if (!c) throw new Error('ActionProvider missing'); return c; };

export function ActionProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<{ o: RunOpts; fn: (note: string) => Promise<unknown> } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const toast = useCallback((kind: ToastItem['kind'], msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const run = useCallback((o: RunOpts, fn: (note: string) => Promise<unknown>) => { setNote(''); setPending({ o, fn }); }, []);
  const close = useCallback(() => { if (!busy) setPending(null); }, [busy]);

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.fn(note.trim());
      toast('success', pending.o.success);
      setPending(null);
      await qc.invalidateQueries();
    } catch (e) {
      handleAuthError(e);
      toast('error', errMsg(e));
    } finally { setBusy(false); }
  };

  const o = pending?.o;
  return (
    <ActionCtx.Provider value={{ toast, run }}>
      {children}
      <Modal
        open={!!pending} title={o?.title ?? ''} onClose={close}
        footer={<><Button onClick={close} disabled={busy}>Cancel</Button><Button variant={o?.danger ? 'danger' : 'primary'} loading={busy} disabled={!!o?.noteRequired && !note.trim()} onClick={confirm}>{o?.confirmLabel ?? 'Confirm'}</Button></>}
      >
        {o?.description && <div className="text-sm text-subtle">{o.description}</div>}
        {o?.noteLabel && <Field label={`${o.noteLabel} (${o.noteRequired ? 'required' : 'optional'})`}>{(id) => <Textarea id={id} rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />}</Field>}
      </Modal>
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex items-start gap-2 rounded-lg border border-line bg-white p-3 text-sm shadow-lg">
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />}
            <span className="flex-1">{t.msg}</span>
          </div>
        ))}
      </div>
    </ActionCtx.Provider>
  );
}
