import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  const base = 'inline-flex items-center justify-center gap-2 rounded-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap';
  const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[15px]', lg: 'h-[52px] px-6 text-[15px]' }[size];
  const variants = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800',
    secondary: 'border border-line-strong bg-white text-navy hover:bg-surface',
    ghost: 'text-teal-700 hover:bg-teal-tint',
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
  return <Link className={buttonClass(variant, size, className)} {...rest} style={variant === 'secondary' || variant === 'ghost' ? rest.style : { color: '#fff', ...rest.style }} />;
}

export function IconButton({ label, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-navy hover:bg-surface ${className}`} {...rest}>
      {children}
    </button>
  );
}
