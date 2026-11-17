import { useMemo } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import {
  Ban,
  CalendarRange,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  History,
  Mail,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Store,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useLiveQuery } from '../../lib/hooks';
import { goTo } from '../../lib/help';
import { formatHours, shiftDuration, shiftMeta, timeRange } from '../../lib/shifts';
import type { StaffStats } from '../../lib/staffStats';
import { capitalize, cn, fmt, fullName, toISODate, weekLabel } from '../../lib/utils';
import type { ActivityLog, Shop, User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Drawer } from '../ui/Drawer';
import { InfoTip } from '../ui/InfoTip';
import { HoursBar, WeekStrip } from './StaffWidgets';

export type StaffAction = 'edit' | 'promote' | 'demote' | 'block' | 'delete';

interface Props {
  user: User | null;
  stats: StaffStats | null;
  days: Date[];
  shops: Shop[];
  isMe: boolean;
  today: string;
  onClose: () => void;
  onAction: (a: StaffAction, u: User) => void;
}

function relativeDay(iso: string) {
  const d = differenceInCalendarDays(parseISO(iso), new Date());
  if (d === 0) return 'Oggi';
  if (d === 1) return 'Domani';
  if (d < 7) return capitalize(fmt(iso, 'EEEE'));
  return capitalize(fmt(iso, 'EEE d MMM'));
}

export default function EmployeeDetail({ user, stats, days, shops, isMe, today, onClose, onAction }: Props) {
  const shopsById = useMemo(() => Object.fromEntries(shops.map(s => [s.id, s])), [shops]);
  const { data: logs } = useLiveQuery<ActivityLog>(
    user ? () => query(collection(db, 'activityLogs'), where('targetUserId', '==', user.id)) : null,
    `staff-logs-${user?.id}`,
  );
  const recent = useMemo(() => [...logs].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6), [logs]);
  const myShops = shops.filter(s => (user?.shopIds ?? []).includes(s.id));

  return (
    <Drawer open={!!user} onClose={onClose} label={user ? `Scheda di ${fullName(user)}` : 'Scheda dipendente'}>
      {user && stats && (
        <div className="pb-10">
          {/* Intestazione */}
          <header className="bg-brand-800 bubbles text-white px-6 pt-8 pb-6">
            <div className="flex items-center gap-4">
              <Avatar user={user} size="xl" className="ring-4 ring-white/20" />
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold truncate">
                  {fullName(user)} {isMe && <span className="text-sm font-medium text-brand-200">(tu)</span>}
                </h2>
                <a href={`mailto:${user.email}`} className="text-sm text-brand-100/90 hover:text-white flex items-center gap-1.5 truncate">
                  <Mail size={14} /> {user.email}
                </a>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="chip bg-white/15 text-white">
                    {user.role === 'admin' ? <><ShieldCheck size={13} /> Amministratore</> : 'Dipendente'}
                  </span>
                  {user.isBlocked && <span className="chip bg-rose-500 text-white"><Ban size={13} /> Sospeso</span>}
                  {user.role !== 'admin' && (
                    <span className="chip bg-white/15 text-white">
                      {user.canSeeColleagues ? <Eye size={13} /> : <EyeOff size={13} />}
                      {user.canSeeColleagues ? 'Vede colleghi' : 'Solo propri turni'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button className="btn btn-sm bg-white text-brand-900 hover:bg-brand-50" onClick={() => onAction('edit', user)}>
                <Pencil size={15} /> Modifica scheda
              </button>
              <button className="btn btn-sm bg-white/10 text-white hover:bg-white/20" onClick={() => { onClose(); goTo('planner'); }}>
                <CalendarRange size={15} /> Apri il Planner
              </button>
            </div>
          </header>

          <div className="px-4 sm:px-6 -mt-3 space-y-4">
            {/* Ore */}
            <section className="card p-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Clock size={17} className="text-brand-600" /> Ore · settimana {weekLabel(days)}
              </h3>
              <div className="mt-3">
                <HoursBar stats={stats} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <Tile label="Questo mese" value={formatHours(stats.monthHours)} sub={`${stats.monthShifts} turni`} />
                <Tile
                  label="Media 4 sett."
                  value={formatHours(stats.avg4)}
                  sub="settimane precedenti"
                  icon={<InfoTip align="center">Media delle ore settimanali nelle 4 settimane prima di quella selezionata. Utile per capire il carico abituale.</InfoTip>}
                />
                <Tile label="Contratto" value={stats.contract ? formatHours(stats.contract) : '—'} sub={stats.contract ? 'a settimana' : 'non impostato'} />
              </div>
              {!stats.contract && (
                <p className="mt-3 text-[13px] text-slate-500">
                  Imposta le ore da contratto con «Modifica scheda» per vedere le ore libere e gli avvisi di superamento.
                </p>
              )}
            </section>

            {/* Settimana */}
            <section className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">La settimana</h3>
                <WeekStrip byDay={stats.byDay} days={days} shopsById={shopsById} today={today} size="sm" />
              </div>
              <ul className="mt-4 divide-y divide-slate-100">
                {stats.byDay.map((list, i) => {
                  const iso = toISODate(days[i]);
                  return (
                    <li key={iso} className={cn('flex gap-3 py-2.5', iso < today && 'opacity-60')}>
                      <span className={cn('w-16 shrink-0 text-sm font-semibold', iso === today ? 'text-brand-600' : 'text-slate-500')}>
                        {capitalize(fmt(days[i], 'EEE d'))}
                      </span>
                      <div className="flex-1 space-y-1">
                        {list.length === 0 ? (
                          <span className="text-sm text-slate-300">Riposo</span>
                        ) : (
                          list.map(s => {
                            const m = shiftMeta(s.shiftType);
                            return (
                              <div key={s.id} className="flex flex-wrap items-center gap-x-2 text-sm">
                                <span className={cn('chip border', m.soft)}>
                                  <m.icon size={12} /> {m.label}
                                </span>
                                <span className="tabular-nums text-slate-600">{timeRange(shopsById[s.shopId], s.shiftType)}</span>
                                <span className="text-slate-400 text-[13px] flex items-center gap-1">
                                  <Store size={12} /> {shopsById[s.shopId]?.name ?? 'Negozio'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                      {list.length > 0 && (
                        <span className="text-sm font-semibold text-slate-700 tabular-nums">
                          {formatHours(list.reduce((t, s) => t + shiftDuration(shopsById[s.shopId], s.shiftType), 0))}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* Prossimi turni */}
            <section className="card p-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp size={17} className="text-brand-600" /> Prossimi turni
              </h3>
              {stats.upcoming.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">Nessun turno in programma.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {stats.upcoming.map(s => {
                    const m = shiftMeta(s.shiftType);
                    return (
                      <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                        <span className={cn('size-8 rounded-xl flex items-center justify-center', m.solid)}>
                          <m.icon size={15} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-800">
                            {relativeDay(s.date)} · {m.label}
                          </span>
                          <span className="block text-[13px] text-slate-500 truncate">
                            {timeRange(shopsById[s.shopId], s.shiftType)} · {shopsById[s.shopId]?.name ?? 'Negozio'}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Negozi e permessi */}
            <section className="card p-5">
              <h3 className="font-bold text-slate-900">Negozi e permessi</h3>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {myShops.length ? (
                  myShops.map(s => (
                    <span key={s.id} className="chip bg-white border border-slate-200 text-slate-700">
                      <Store size={12} className="text-brand-500" /> {s.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">Nessun negozio assegnato</span>
                )}
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {user.role === 'admin'
                  ? 'Come amministratore gestisce tutti i negozi.'
                  : user.canSeeColleagues
                    ? 'Vede i turni dei colleghi e può proporre scambi.'
                    : 'Vede solo i propri turni e non può proporre scambi.'}
              </p>
            </section>

            {/* Attività */}
            <section className="card p-5">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <History size={17} className="text-brand-600" /> Attività recenti
              </h3>
              {recent.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">Nessuna modifica registrata per questa persona.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {recent.map(l => (
                    <li key={l.id} className="text-sm">
                      <p className="text-slate-800">
                        {l.action} <span className="text-slate-400">· {l.actorName}</span>
                      </p>
                      <p className="text-[12px] text-slate-400">{fmt(l.at, "d MMM yyyy 'alle' HH:mm")}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Azioni */}
            {!isMe && (
              <section className="card p-5">
                <h3 className="font-bold text-slate-900 mb-3">Accesso e ruolo</h3>
                <div className="grid sm:grid-cols-3 gap-2">
                  <button
                    className={cn('btn btn-secondary btn-sm', user.isBlocked ? 'text-emerald-700' : 'hover:text-amber-700')}
                    onClick={() => onAction('block', user)}
                  >
                    {user.isBlocked ? <CheckCircle2 size={15} /> : <Ban size={15} />} {user.isBlocked ? 'Riattiva' : 'Sospendi'}
                  </button>
                  {user.role === 'employee' ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => onAction('promote', user)}>
                      <ShieldCheck size={15} /> Rendi admin
                    </button>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => onAction('demote', user)}>
                      <ShieldOff size={15} /> Togli admin
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm hover:text-rose-600 hover:border-rose-200" onClick={() => onAction('delete', user)}>
                    <Trash2 size={15} /> Elimina
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[12px] font-semibold text-slate-500 flex items-center gap-0.5">
        {label} {icon}
      </p>
      <p className="text-lg font-extrabold text-brand-950 tabular-nums">{value}</p>
      <p className="text-[12px] text-slate-400">{sub}</p>
    </div>
  );
}
