import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'dark';
type Size = 'sm' | 'md' | 'lg';

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-bold transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap';
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[15px]', lg: 'h-[52px] px-6 text-[15px]' }[size];
  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-deep',
    accent: 'bg-accent text-accent-ink hover:brightness-95',
    dark: 'bg-navy text-white hover:opacity-90',
    secondary: 'border-[1.5px] border-line bg-white text-ink hover:bg-surface',
    ghost: 'text-brand hover:bg-teal-tint',
    danger: 'bg-danger text-white hover:opacity-90',
  }[variant];
  return `${base} ${sizes} ${variants} ${extra}`;
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }
export const Button = forwardRef<HTMLButtonElement, Props>(function Button({ variant, size, loading, icon, className = '', children, disabled, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({ variant, size, className = '', ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} style={variant === 'secondary' || variant === 'ghost' || variant === 'accent' ? rest.style : { color: '#fff', ...rest.style }} />;
}

export function IconButton({ label, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-navy hover:bg-surface ${className}`} {...rest}>
      {children}
    </button>
  );
}
