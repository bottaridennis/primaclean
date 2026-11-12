import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-slate-400', className)} role="status">
      <Loader2 size={28} className="animate-spin text-brand-500" />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center text-center px-6 py-12', className)}>
      <div className="size-14 rounded-2xl bg-brand-50 text-brand-500 flex items-center justify-center mb-4">
        <Icon size={26} />
      </div>
      <p className="font-bold text-slate-800">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-brand-950">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 text-left rounded-2xl border border-slate-200 bg-white px-4 py-3.5 hover:border-slate-300 transition-colors disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {description && <span className="block text-[13px] text-slate-500 mt-0.5">{description}</span>}
      </span>
      <span
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-600' : 'bg-slate-300',
        )}
      >
        <motion.span
          className="absolute top-1 left-1 size-5 rounded-full bg-white shadow"
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </button>
  );
}

/** Selettore "a pillole" (es. scelta negozio) con scroll orizzontale su mobile */
export function PillTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: { value: T; label: ReactNode; badge?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      className={cn('flex gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1 md:flex-wrap', className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-all border',
              active
                ? 'bg-brand-950 text-white border-brand-950 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800',
            )}
          >
            {o.label}
            {o.badge}
          </button>
        );
      })}
    </div>
  );
}

/** Controllo segmentato per scelte esclusive */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex p-1 bg-slate-100 rounded-2xl', className)}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 h-10 px-3 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
            o.value === value ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
