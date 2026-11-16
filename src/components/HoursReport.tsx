import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { addDays, addMonths, eachWeekOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, FileSpreadsheet, Printer, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { useApprovedUsers, useLiveQuery, useShops } from '../lib/hooks';
import { formatHours, shiftDuration, shiftMeta, timeRange, hoursFor } from '../lib/shifts';
import { capitalize, cn, fmt, fullName, toISODate } from '../lib/utils';
import { downloadFile, slug, toCSV } from '../lib/export';
import { HELP } from '../lib/help';
import type { Shift, User } from '../types';
import { Avatar } from './ui/Avatar';
import { InfoTip } from './ui/InfoTip';
import { EmptyState, PageHeader, Spinner } from './ui/Primitives';

interface Row {
  user: User | { id: string; nome: string; cognome: string; email?: string; weeklyHours?: number; shopIds?: string[] };
  shifts: number;
  monthHours: number;
  weeks: number[];
  overWeeks: number;
}

export default function HoursReport() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [shopId, setShopId] = useState('');
  const { data: shops } = useShops();
  const { data: staff } = useApprovedUsers();

  const monthStart = toISODate(startOfMonth(month));
  const monthEnd = toISODate(endOfMonth(month));
  // Le settimane a cavallo del mese vengono calcolate per intero, per confrontarle con le ore da contratto
  const weeks = useMemo(
    () => eachWeekOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }, { weekStartsOn: 1 }),
    [month],
  );
  const rangeStart = toISODate(startOfWeek(startOfMonth(month), { weekStartsOn: 1 }));
  const rangeEnd = toISODate(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }));

  const { data: allShifts, loading } = useLiveQuery<Shift>(
    () => query(collection(db, 'shifts'), where('date', '>=', rangeStart), where('date', '<=', rangeEnd)),
    `hours-${rangeStart}`,
  );

  const shopById = useMemo(() => Object.fromEntries(shops.map(s => [s.id, s])), [shops]);
  const shifts = useMemo(() => allShifts.filter(s => !shopId || s.shopId === shopId), [allShifts, shopId]);
  const hoursOf = (s: Shift) => shiftDuration(shopById[s.shopId], s.shiftType);

  const rows: Row[] = useMemo(() => {
    const ids = new Set(shifts.map(s => s.userId));
    staff
      .filter(u => !u.isBlocked && u.role === 'employee' && (!shopId || (u.shopIds ?? []).includes(shopId)))
      .forEach(u => ids.add(u.id));
    const byId = Object.fromEntries(staff.map(u => [u.id, u]));
    return Array.from(ids)
      .map(id => {
        const user: Row['user'] = byId[id] ?? { id, nome: 'Utente', cognome: 'rimosso' };
        const mine = shifts.filter(s => s.userId === id);
        const inMonth = mine.filter(s => s.date >= monthStart && s.date <= monthEnd);
        const weekHours = weeks.map(w => {
          const a = toISODate(w);
          const b = toISODate(addDays(w, 6));
          return mine.filter(s => s.date >= a && s.date <= b).reduce((t, s) => t + hoursOf(s), 0);
        });
        const limit = user.weeklyHours ?? 0;
        return {
          user,
          shifts: inMonth.length,
          monthHours: inMonth.reduce((t, s) => t + hoursOf(s), 0),
          weeks: weekHours,
          overWeeks: limit ? weekHours.filter(h => h > limit + 0.001).length : 0,
        };
      })
      .sort((a, b) => fullName(a.user).localeCompare(fullName(b.user), 'it'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shifts, staff, shopId, weeks, monthStart, monthEnd, shopById]);

  const totalHours = rows.reduce((t, r) => t + r.monthHours, 0);
  const totalShifts = rows.reduce((t, r) => t + r.shifts, 0);
  const overPeople = rows.filter(r => r.overWeeks > 0);
  const monthLabel = capitalize(fmt(month, 'MMMM yyyy'));
  const scope = shopId ? shopById[shopId]?.name ?? '' : 'tutti i negozi';
  const weekLabel = (w: Date) =>
    w.getMonth() === addDays(w, 6).getMonth() ? `${fmt(w, 'd')}–${fmt(addDays(w, 6), 'd MMM')}` : `${fmt(w, 'd MMM')}–${fmt(addDays(w, 6), 'd MMM')}`;

  const exportSummary = () => {
    const csv = toCSV([
      [`Riepilogo ore ${monthLabel} – ${scope}`],
      [],
      ['Dipendente', 'Email', 'Turni nel mese', 'Ore nel mese', 'Ore contratto/settimana', ...weeks.map(w => `Sett. ${weekLabel(w)}`), 'Settimane oltre contratto'],
      ...rows.map(r => [
        fullName(r.user),
        r.user.email ?? '',
        r.shifts,
        r.monthHours,
        r.user.weeklyHours ?? '',
        ...r.weeks,
        r.user.weeklyHours ? r.overWeeks : '',
      ]),
      [],
      ['Totale', '', totalShifts, totalHours],
    ]);
    downloadFile(`ore-${slug(monthLabel)}-${slug(scope)}.csv`, csv);
  };

  const exportDetail = () => {
    const names = Object.fromEntries(staff.map(u => [u.id, fullName(u)]));
    const list = shifts
      .filter(s => s.date >= monthStart && s.date <= monthEnd)
      .sort((a, b) => a.date.localeCompare(b.date) || (names[a.userId] ?? '').localeCompare(names[b.userId] ?? ''));
    const csv = toCSV([
      ['Data', 'Giorno', 'Negozio', 'Dipendente', 'Fascia', 'Inizio', 'Fine', 'Pausa (min)', 'Ore'],
      ...list.map(s => {
        const h = hoursFor(shopById[s.shopId], s.shiftType);
        return [
          fmt(s.date, 'dd/MM/yyyy'),
          capitalize(fmt(s.date, 'EEEE')),
          shopById[s.shopId]?.name ?? '',
          names[s.userId] ?? 'Utente rimosso',
          shiftMeta(s.shiftType).label,
          h.start,
          h.end,
          h.breakMinutes ?? 0,
          hoursOf(s),
        ];
      }),
    ]);
    downloadFile(`turni-${slug(monthLabel)}-${slug(scope)}.csv`, csv);
  };

  return (
    <div>
      <PageHeader
        title="Ore e presenze"
        description="Ore lavorate da ogni persona nel mese, con avviso quando si superano le ore da contratto."
        help={HELP.hours}
        actions={
          <>
            <button className="btn btn-secondary" onClick={exportSummary} disabled={rows.length === 0}>
              <FileSpreadsheet size={17} /> Esporta ore
            </button>
            <button className="btn btn-secondary" onClick={exportDetail} disabled={totalShifts === 0}>
              <FileSpreadsheet size={17} /> Esporta turni
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={17} /> Stampa / PDF
            </button>
          </>
        }
      />

      <p className="hidden print:block text-lg font-bold mb-4">
        Ore e presenze · {monthLabel} · {scope}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-5 print:hidden">
        <div className="card flex items-center gap-1 p-1.5 sm:w-auto">
          <button className="btn-icon" onClick={() => setMonth(m => addMonths(m, -1))} aria-label="Mese precedente">
            <ChevronLeft size={20} />
          </button>
          <p className="flex-1 min-w-40 text-center font-bold text-slate-900">{monthLabel}</p>
          <button className="btn-icon" onClick={() => setMonth(m => addMonths(m, 1))} aria-label="Mese successivo">
            <ChevronRight size={20} />
          </button>
        </div>
        <select className="input sm:w-64" value={shopId} onChange={e => setShopId(e.target.value)} aria-label="Filtra per negozio">
          <option value="">Tutti i negozi</option>
          {shops.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <Stat label="Ore totali nel mese" value={formatHours(Math.round(totalHours * 100) / 100)} />
        <Stat label="Turni nel mese" value={String(totalShifts)} />
        <Stat
          label="Persone oltre contratto"
          value={String(overPeople.length)}
          warn={overPeople.length > 0}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {overPeople.length > 0 && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="shrink-0 mt-px" />
          <span>
            <strong>{overPeople.map(r => r.user.nome).join(', ')}</strong> {overPeople.length === 1 ? 'ha' : 'hanno'} superato le ore da
            contratto in almeno una settimana. Le celle evidenziate in arancione mostrano quali.
          </span>
        </p>
      )}

      {loading && rows.length === 0 ? (
        <Spinner label="Calcolo delle ore…" />
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Users} title="Nessun dato" description="Non ci sono dipendenti o turni per questo mese e negozio." />
        </div>
      ) : (
        <div className="card overflow-hidden print:shadow-none print:border-slate-300">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-sm border-collapse min-w-[720px] print:min-w-0">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="sticky left-0 bg-white px-4 py-3 font-semibold">Dipendente</th>
                  <th className="px-3 py-3 font-semibold text-right">Turni</th>
                  <th className="px-3 py-3 font-semibold text-right">Ore mese</th>
                  <th className="px-3 py-3 font-semibold text-right">
                    <span className="inline-flex items-center gap-1">
                      Contratto
                      <InfoTip align="right">Ore settimanali da contratto, impostabili da Personale → Modifica. Se manca, non vengono segnalati superamenti.</InfoTip>
                    </span>
                  </th>
                  {weeks.map(w => (
                    <th key={w.toISOString()} className="px-3 py-3 font-semibold text-right whitespace-nowrap">
                      Sett. {weekLabel(w)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.user.id} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar user={r.user} size="sm" className="print:hidden" />
                        <span className="font-semibold text-slate-800 whitespace-nowrap">{fullName(r.user)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.shifts}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">{formatHours(round(r.monthHours))}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{r.user.weeklyHours ? `${r.user.weeklyHours} h/sett.` : '—'}</td>
                    {r.weeks.map((h, i) => {
                      const over = !!r.user.weeklyHours && h > r.user.weeklyHours + 0.001;
                      return (
                        <td key={i} className="px-3 py-2.5 text-right tabular-nums">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-lg px-2 py-0.5',
                              over ? 'bg-amber-100 text-amber-900 font-bold' : h === 0 ? 'text-slate-300' : 'text-slate-700',
                            )}
                            title={over ? `Oltre il contratto di ${formatHours(round(h - (r.user.weeklyHours ?? 0)))}` : undefined}
                          >
                            {over && <AlertTriangle size={12} />}
                            {formatHours(round(h))}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-slate-900">
                  <td className="sticky left-0 bg-slate-50 px-4 py-3">Totale</td>
                  <td className="px-3 py-3 text-right tabular-nums">{totalShifts}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatHours(round(totalHours))}</td>
                  <td />
                  {weeks.map((w, i) => (
                    <td key={w.toISOString()} className="px-3 py-3 text-right tabular-nums">
                      {formatHours(round(rows.reduce((t, r) => t + r.weeks[i], 0)))}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-[13px] text-slate-500 flex items-start gap-2 print:hidden">
        <Clock size={15} className="shrink-0 mt-0.5" />
        <span>
          Le ore si calcolano dagli orari delle fasce di ogni negozio (pausa esclusa), modificabili in «Negozi e chiusure». Le
          settimane a cavallo del mese sono conteggiate per intero. Orari attuali
          {shopId ? ` di ${shopById[shopId]?.name}` : ' predefiniti'}: Mattina {timeRange(shopById[shopId], 'morning')}, Pomeriggio{' '}
          {timeRange(shopById[shopId], 'afternoon')}, Giornata intera {timeRange(shopById[shopId], 'full-day')}.
        </span>
      </p>
    </div>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;

function Stat({ label, value, warn, className }: { label: string; value: string; warn?: boolean; className?: string }) {
  return (
    <div className={cn('card p-4', warn && 'border-amber-300 bg-amber-50/60', className)}>
      <p className="text-2xl font-extrabold text-brand-950 tabular-nums">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
