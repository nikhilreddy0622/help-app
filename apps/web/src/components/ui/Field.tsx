import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const control = 'w-full rounded-md border border-line-strong bg-white px-3 text-[15px] text-ink placeholder:text-muted focus-visible:border-teal-700 disabled:bg-surface aria-[invalid=true]:border-danger';

interface FieldWrap { label: string; error?: string; hint?: string; className?: string }

function Wrap({ label, error, hint, id, children, className = '' }: FieldWrap & { id: string; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-navy">{label}</label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-subtle">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
const aria = (id: string, error?: string, hint?: string) => ({ 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined });

export function Input({ label, error, hint, className, ...rest }: FieldWrap & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return <Wrap id={id} label={label} error={error} hint={hint} className={className}><input id={id} className={`${control} h-11`} {...aria(id, error, hint)} {...rest} /></Wrap>;
}
export function Textarea({ label, error, hint, className, ...rest }: FieldWrap & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return <Wrap id={id} label={label} error={error} hint={hint} className={className}><textarea id={id} rows={4} className={`${control} py-2`} {...aria(id, error, hint)} {...rest} /></Wrap>;
}
export function Select({ label, error, hint, className, children, ...rest }: FieldWrap & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return <Wrap id={id} label={label} error={error} hint={hint} className={className}><select id={id} className={`${control} h-11`} {...aria(id, error, hint)} {...rest}>{children}</select></Wrap>;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-navy">{label}</label>
        {description && <p className="text-xs text-subtle">{description}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-none rounded-full ${checked ? 'bg-teal-700' : 'bg-line-strong'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${active ? 'border-teal-700 bg-teal-tint text-teal-800' : 'border-line-strong bg-white text-subtle hover:bg-surface'}`}>
      {children}{count !== undefined && count > 0 && <span className="text-xs">({count})</span>}
    </button>
  );
}

/** Validate with a zod schema; returns field -> first message. */
import type { ZodTypeAny } from 'zod';
export function fieldErrors(schema: ZodTypeAny, value: unknown): Record<string, string> {
  const r = schema.safeParse(value);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const i of r.error.issues) { const k = String(i.path[0] ?? '_'); if (!out[k]) out[k] = i.message; }
  return out;
}
