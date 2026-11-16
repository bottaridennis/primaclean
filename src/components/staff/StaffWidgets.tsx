import { shiftMeta } from '../../lib/shifts';
import { formatHours } from '../../lib/shifts';
import { cn, fmt } from '../../lib/utils';
import type { Shift, Shop } from '../../types';
import type { StaffStats } from '../../lib/staffStats';

/** Sette caselle (lun→dom) con la fascia di ogni giorno */
export function WeekStrip({ byDay, days, shopsById, today, size = 'md' }: {
  byDay: Shift[][];
  days: Date[];
  shopsById: Record<string, Shop>;
  today: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex gap-1" role="list" aria-label="Turni della settimana">
      {byDay.map((list, i) => {
        const iso = fmt(days[i], 'yyyy-MM-dd');
        const label = `${fmt(days[i], 'EEEE d')}: ${list.length ? list.map(s => `${shiftMeta(s.shiftType).label} a ${shopsById[s.shopId]?.name ?? 'negozio'}`).join(', ') : 'riposo'}`;
        const isToday = iso === today;
        return (
          <div key={i} role="listitem" title={label} aria-label={label} className="flex flex-col items-center gap-0.5">
            <span className={cn('text-[10px] font-semibold uppercase', isToday ? 'text-brand-600' : 'text-slate-400')}>{fmt(days[i], 'EEEEE')}</span>
            <span
              className={cn(
                'rounded-lg flex flex-col overflow-hidden border',
                size === 'sm' ? 'w-6 h-7' : 'w-8 h-9',
                isToday ? 'border-brand-400' : 'border-slate-200',
                list.length === 0 && 'bg-slate-50',
              )}
            >
              {list.map(s => {
                const m = shiftMeta(s.shiftType);
                return (
                  <span key={s.id} className={cn('flex-1 flex items-center justify-center text-[10px] font-bold', m.solid)}>
                    {m.short}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Barra ore settimana / contratto */
export function HoursBar({ stats, compact }: { stats: Pick<StaffStats, 'weekHours' | 'contract' | 'remaining' | 'status'>; compact?: boolean }) {
  const { weekHours, contract, remaining, status } = stats;
  const pct = contract ? Math.min(100, (weekHours / contract) * 100) : 0;
  const tone = {
    over: { bar: 'bg-rose-500', text: 'text-rose-700' },
    full: { bar: 'bg-emerald-500', text: 'text-emerald-700' },
    under: { bar: 'bg-brand-500', text: 'text-slate-500' },
    none: { bar: 'bg-slate-300', text: 'text-slate-400' },
  }[status];

  return (
    <div className={cn('min-w-0', compact ? 'w-40' : 'w-full')}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-bold text-slate-900 tabular-nums">
          {formatHours(weekHours)}
          {contract !== null && <span className="font-medium text-slate-400"> / {formatHours(contract)}</span>}
        </p>
        <p className={cn('text-[12px] font-semibold whitespace-nowrap', tone.text)}>
          {status === 'none'
            ? 'Senza contratto'
            : status === 'over'
              ? `+${formatHours(Math.abs(remaining!))} oltre`
              : status === 'full'
                ? 'Completo'
                : `${formatHours(remaining!)} libere`}
        </p>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
        {contract !== null && <div className={cn('h-full rounded-full transition-all', tone.bar)} style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
}
