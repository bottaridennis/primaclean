import { cn } from '../../lib/utils';

/** Marchio Prima Clean: una gruccia stilizzata con bolle di sapone */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={cn('size-10', className)} aria-hidden="true">
      <rect width="48" height="48" rx="14" className="fill-brand-600" />
      <circle cx="35.5" cy="12.5" r="4" className="fill-white/25" />
      <circle cx="40" cy="20" r="2" className="fill-white/20" />
      <path
        d="M24 13.5a3.25 3.25 0 1 1 3.25 3.25c-1.8 0-3.25 1.2-3.25 3v1.4"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24 21.1 10.6 31.4c-1.3 1-.6 3.1 1 3.1h24.8c1.6 0 2.3-2.1 1-3.1L24 21.1Z"
        stroke="white"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, subtitle = true, light = false }: { className?: string; subtitle?: boolean; light?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark className="size-10 shrink-0" />
      <div className="leading-tight">
        <p className={cn('text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-brand-950')}>
          Prima<span className={light ? 'text-brand-200' : 'text-brand-600'}>Clean</span>
        </p>
        {subtitle && (
          <p className={cn('text-xs font-medium', light ? 'text-brand-100/80' : 'text-slate-500')}>Lavasecco · Gestione turni</p>
        )}
      </div>
    </div>
  );
}
