import { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { addWeeks, addDays, endOfMonth, isSameDay, startOfMonth } from 'date-fns';
import {
  AlertTriangle,
  ArrowDownUp,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Chevron,
  Clock,
  Hourglass,
  Search,
  ShieldCheck,
  Store,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { logActivity, notify } from '../lib/activity';
import { useApprovedUsers, useLiveQuery, usePendingUsers, useShops } from '../lib/hooks';
import { formatHours, shiftMeta } from '../lib/shifts';
import { computeStaffStats, type StaffStats } from '../lib/staffStats';
import { capitalize, cn, fmt, fullName, toISODate, todayISO, weekDays, weekLabel } from '../lib/utils';
import type { Shift, User } from '../types';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { InfoTip } from './ui/InfoTip';
import { EmptyState, PageHeader, PillTabs, Spinner } from './ui/Primitives';
import { useToast } from './ui/Toast';
import UserFormModal from './UserFormModal';
import EmployeeDetail, { type StaffAction } from './staff/EmployeeDetail';
import { HoursBar, WeekStrip } from './staff/StaffWidgets';
import { HELP } from '../lib/help';

type Filter = 'all' | 'employee' | 'admin' | 'blocked' | 'pending' | 'over' | 'free';
type Sort = 'name' | 'hours-desc' | 'free-desc' | 'next';

export default function EmployeeManager({ currentUser }: { currentUser: User }) {
  const toast = useToast();
  const { data: users, loading } = useApprovedUsers();
  const { data: pending } = usePendingUsers();
  const { data: shops } = useShops();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [shopFilter, setShopFilter] = useState('');
  const [sort, setSort] = useState<Sort>('name');
  const [anchor, setAnchor] = useState(() => new Date());
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ user: User; mode: 'edit' | 'approve' } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'promote' | 'demote' | 'block' | 'delete'; user: User } | null>(null);

  const today = todayISO();
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const monthRange: [string, string] = [toISODate(startOfMonth(days[0])), toISODate(endOfMonth(days[0]))];
  // Un'unica query copre: 4 settimane precedenti (media), il mese, la settimana e i prossimi 60 giorni
  const rangeStart = [toISODate(addWeeks(days[0], -4)), monthRange[0]].sort()[0];
  const rangeEnd = [toISODate(days[6]), monthRange[1], toISODate(addDays(new Date(), 60))].sort().reverse()[0];
  const { data: shifts } = useLiveQuery<Shift>(
    () => query(collection(db, 'shifts'), where('date', '>=', rangeStart), where('date', '<=', rangeEnd)),
    `staff-shifts-${rangeStart}-${rangeEnd}`,
  );

  const shopsById = useMemo(() => Object.fromEntries(shops.map(s => [s.id, s])), [shops]);
  const shopName = (id: string) => shopsById[id]?.name;

  const stats = useMemo(() => {
    const out: Record<string, StaffStats> = {};
    users.forEach(u => (out[u.id] = computeStaffStats(u, shifts, shopsById, days, monthRange, today)));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, shifts, shopsById, days, today]);

  const list = useMemo(() => {
    const base = filter === 'pending' ? pending : users;
    const q = search.trim().toLowerCase();
    const filtered = base.filter(u => {
      const st = stats[u.id];
      if (filter === 'employee' && u.role !== 'employee') return false;
      if (filter === 'admin' && u.role !== 'admin') return false;
      if (filter === 'blocked' && !u.isBlocked) return false;
      if (filter === 'over' && st?.status !== 'over') return false;
      if (filter === 'free' && !(st?.status === 'under' && !u.isBlocked)) return false;
      if (shopFilter && !(u.shopIds ?? []).includes(shopFilter)) return false;
      if (q && !`${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const byName = (a: User, b: User) => fullName(a).localeCompare(fullName(b), 'it');
    return filtered.sort((a, b) => {
      const sa = stats[a.id];
      const sb = stats[b.id];
      if (!sa || !sb) return byName(a, b);
      if (sort === 'hours-desc') return sb.weekHours - sa.weekHours || byName(a, b);
      if (sort === 'free-desc') return (sb.remaining ?? -999) - (sa.remaining ?? -999) || byName(a, b);
      if (sort === 'next') return (sa.next?.date ?? '9999').localeCompare(sb.next?.date ?? '9999') || byName(a, b);
      return byName(a, b);
    });
  }, [users, pending, filter, search, shopFilter, sort, stats]);

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    try {
      if (kind === 'promote') {
        await updateDoc(doc(db, 'users', user.id), { role: 'admin' });
        logActivity({ kind: 'user', action: 'Promosso ad amministratore', details: fullName(user), targetUserId: user.id });
        notify(user.id, 'Sei amministratore', 'Ora puoi gestire personale, negozi e turni.', 'dashboard');
        toast.success(`${user.nome} ora è amministratore.`);
      } else if (kind === 'demote') {
        await updateDoc(doc(db, 'users', user.id), { role: 'employee' });
        logActivity({ kind: 'user', action: 'Permessi admin revocati', details: fullName(user), targetUserId: user.id });
        toast.success(`${user.nome} ora è un dipendente.`);
      } else if (kind === 'block') {
        await updateDoc(doc(db, 'users', user.id), { isBlocked: !user.isBlocked });
        logActivity({ kind: 'user', action: user.isBlocked ? 'Accesso riattivato' : 'Accesso sospeso', details: fullName(user), targetUserId: user.id });
        toast.success(user.isBlocked ? `Accesso di ${user.nome} riattivato.` : `Accesso di ${user.nome} sospeso.`);
      } else if (kind === 'delete') {
        // Elimina anche i turni futuri del dipendente, così non restano "buchi" fantasma in agenda
        const snap = await getDocs(query(collection(db, 'shifts'), where('userId', '==', user.id)));
        const future = snap.docs.filter(d => (d.data().date as string) >= todayISO());
        for (let i = 0; i < future.length; i += 450) {
          const batch = writeBatch(db);
          future.slice(i, i + 450).forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        await deleteDoc(doc(db, 'users', user.id));
        logActivity({ kind: 'user', action: user.isApproved ? 'Profilo eliminato' : 'Richiesta rifiutata', details: `${fullName(user)}${future.length ? ` · ${future.length} turni futuri rimossi` : ''}`, targetUserId: user.id });
        toast.success(`Profilo di ${user.nome} eliminato${future.length ? ` insieme a ${future.length} turni futuri` : ''}.`);
      }
    } catch (err) {
      toast.error(err);
    }
  };

  const onAction = (a: StaffAction, u: User) => {
    if (a === 'edit') setEditing({ user: u, mode: 'edit' });
    else setConfirm({ kind: a, user: u });
  };

  if (loading) return <Spinner label="Caricamento personale…" />;

  const active = users.filter(u => !u.isBlocked);
  const counts = {
    all: users.length,
    employee: users.filter(u => u.role === 'employee').length,
    admin: users.filter(u => u.role === 'admin').length,
    blocked: users.filter(u => u.isBlocked).length,
    pending: pending.length,
    over: users.filter(u => stats[u.id]?.status === 'over').length,
    free: active.filter(u => stats[u.id]?.status === 'under').length,
  };
  const weekTotal = active.reduce((t, u) => t + (stats[u.id]?.weekHours ?? 0), 0);
  const freeTotal = active.reduce((t, u) => t + Math.max(0, stats[u.id]?.remaining ?? 0), 0);
  const isCurrentWeek = days.some(d => isSameDay(d, new Date()));
  const openUser = users.find(u => u.id === openId) ?? null;

  const confirmCopy = confirm && {
    promote: {
      title: `Promuovere ${confirm.user.nome} ad amministratore?`,
      message: 'Potrà gestire personale, negozi e turni di tutte le sedi, incluso modificare i permessi degli altri amministratori.',
      label: 'Promuovi',
      tone: 'primary' as const,
    },
    demote: {
      title: `Revocare i permessi di ${confirm.user.nome}?`,
      message: 'Tornerà a essere un dipendente e vedrà solo i turni dei negozi assegnati.',
      label: 'Revoca permessi',
      tone: 'danger' as const,
    },
    block: confirm.user.isBlocked
      ? { title: `Riattivare ${confirm.user.nome}?`, message: 'Potrà di nuovo accedere all\'app e consultare i turni.', label: 'Riattiva', tone: 'primary' as const }
      : {
          title: `Sospendere ${confirm.user.nome}?`,
          message: 'Non potrà più accedere all\'app finché non verrà riattivato. I turni già assegnati restano invariati.',
          label: 'Sospendi accesso',
          tone: 'danger' as const,
        },
    delete: {
      title: `Eliminare ${fullName(confirm.user)}?`,
      message: 'Il profilo e tutti i suoi turni futuri verranno eliminati. Lo storico degli scambi resterà consultabile. L\'operazione non è reversibile.',
      label: 'Elimina definitivamente',
      tone: 'danger' as const,
    },
  }[confirm.kind];

  return (
    <div>
      <PageHeader
        title="Personale"
        description="Chi lavora, quanto e dove: ore della settimana, contratto, prossimi turni e accessi."
        help={HELP.staff}
      />

      {/* Settimana di riferimento + riepilogo */}
      <section className="card p-4 sm:p-5 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-icon" onClick={() => setAnchor(a => addWeeks(a, -1))} aria-label="Settimana precedente">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-40">
            <p className="eyebrow">Settimana di riferimento</p>
            <p className="font-bold text-slate-900">{weekLabel(days)}</p>
          </div>
          <button className="btn-icon" onClick={() => setAnchor(a => addWeeks(a, 1))} aria-label="Settimana successiva">
            <ChevronRight size={20} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setAnchor(new Date())} disabled={isCurrentWeek}>
            Questa settimana
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
          <Kpi icon={Users} label="Personale attivo" value={String(active.length)} />
          <Kpi icon={Clock} label="Ore pianificate" value={formatHours(Math.round(weekTotal * 10) / 10)} />
          <Kpi
            icon={AlertTriangle}
            label="Oltre contratto"
            value={String(counts.over)}
            tone={counts.over ? 'danger' : undefined}
            onClick={counts.over ? () => setFilter('over') : undefined}
          />
          <Kpi
            icon={Hourglass}
            label={`Con ore libere · ${formatHours(Math.round(freeTotal * 10) / 10)}`}
            value={String(counts.free)}
            tone={counts.free ? 'info' : undefined}
            onClick={counts.free ? () => setFilter('free') : undefined}
            info="Persone con un contratto che in questa settimana hanno ancora ore disponibili: utile per coprire un turno scoperto."
          />
        </div>
      </section>

      {/* Filtri */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-11 pr-10" placeholder="Cerca per nome o email…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Cerca personale" />
            {search && (
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon size-9" onClick={() => setSearch('')} aria-label="Cancella ricerca">
                <X size={16} />
              </button>
            )}
          </div>
          <select className="input md:w-56" value={shopFilter} onChange={e => setShopFilter(e.target.value)} aria-label="Filtra per negozio">
            <option value="">Tutti i negozi</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="relative md:w-60">
            <ArrowDownUp size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select className="input pl-10" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Ordina">
              <option value="name">Ordina per nome</option>
              <option value="hours-desc">Più ore questa settimana</option>
              <option value="free-desc">Più ore libere</option>
              <option value="next">Prossimo turno</option>
            </select>
          </div>
        </div>
        <PillTabs<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Filtra personale"
          options={[
            { value: 'all', label: 'Tutti', badge: <Count n={counts.all} /> },
            { value: 'pending', label: 'In attesa', badge: counts.pending ? <Count n={counts.pending} warn /> : undefined },
            { value: 'over', label: 'Oltre contratto', badge: counts.over ? <Count n={counts.over} danger /> : undefined },
            { value: 'free', label: 'Con ore libere', badge: <Count n={counts.free} /> },
            { value: 'employee', label: 'Dipendenti', badge: <Count n={counts.employee} /> },
            { value: 'admin', label: 'Amministratori', badge: <Count n={counts.admin} /> },
            { value: 'blocked', label: 'Sospesi', badge: <Count n={counts.blocked} /> },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={filter === 'pending' ? UserPlus : Users}
            title={filter === 'pending' ? 'Nessuna richiesta in attesa' : 'Nessun risultato'}
            description={search || shopFilter ? 'Prova a modificare la ricerca o i filtri.' : undefined}
          />
        </div>
      ) : filter === 'pending' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(u => (
            <article key={u.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar user={u} size="lg" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{fullName(u)}</p>
                  <p className="text-[13px] text-slate-500 truncate">{u.email}</p>
                </div>
              </div>
              <p className="text-[13px] text-slate-500">Si è registrato e aspetta che tu scelga il suo negozio.</p>
              <div className="flex gap-2">
                <button className="btn btn-primary btn-sm flex-1" onClick={() => setEditing({ user: u, mode: 'approve' })}>
                  <CheckCircle2 size={15} /> Approva
                </button>
                <button className="btn btn-secondary btn-sm hover:text-rose-600" onClick={() => setConfirm({ kind: 'delete', user: u })}>
                  <X size={15} /> Rifiuta
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          {/* Tabella desktop */}
          <div className="card overflow-hidden hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-3 font-semibold">Persona</th>
                  <th className="px-3 py-3 font-semibold">Settimana</th>
                  <th className="px-3 py-3 font-semibold">
                    <span className="inline-flex items-center gap-1">
                      Ore / contratto
                      <InfoTip>Ore pianificate nella settimana scelta rispetto alle ore settimanali da contratto. Rosso = oltre il contratto, verde = completo.</InfoTip>
                    </span>
                  </th>
                  <th className="px-3 py-3 font-semibold">Prossimo turno</th>
                  <th className="px-3 py-3 font-semibold">Negozi</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map(u => {
                  const st = stats[u.id];
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setOpenId(u.id)}
                      className={cn('cursor-pointer hover:bg-brand-50/40 transition-colors', u.isBlocked && 'opacity-60')}
                    >
                      <td className="px-5 py-3">
                        <PersonCell user={u} isMe={u.id === currentUser.id} />
                      </td>
                      <td className="px-3 py-3">
                        {st && <WeekStrip byDay={st.byDay} days={days} shopsById={shopsById} today={today} size="sm" />}
                      </td>
                      <td className="px-3 py-3">{st && <HoursBar stats={st} compact />}</td>
                      <td className="px-3 py-3">
                        <NextShift st={st} shopName={shopName} />
                      </td>
                      <td className="px-3 py-3 max-w-44">
                        <ShopChips ids={u.shopIds ?? []} shopName={shopName} />
                      </td>
                      <td className="pl-1 pr-4 py-3 text-right w-12">
                        <button
                          className="btn-icon"
                          aria-label={`Apri la scheda di ${fullName(u)}`}
                          onClick={e => {
                            e.stopPropagation();
                            setOpenId(u.id);
                          }}
                        >
                          <Chevron size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Schede mobile/tablet */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {list.map(u => {
              const st = stats[u.id];
              return (
                <motion.button
                  key={u.id}
                  layout
                  onClick={() => setOpenId(u.id)}
                  className={cn('card p-4 text-left flex flex-col gap-3 active:scale-[0.99] transition-transform', u.isBlocked && 'opacity-70')}
                >
                  <div className="flex items-center gap-3 w-full">
                    <PersonCell user={u} isMe={u.id === currentUser.id} />
                    <Chevron size={18} className="ml-auto text-slate-300 shrink-0" />
                  </div>
                  {st && <HoursBar stats={st} />}
                  <div className="flex items-end justify-between gap-3 w-full">
                    {st && <WeekStrip byDay={st.byDay} days={days} shopsById={shopsById} today={today} size="sm" />}
                  </div>
                  <div className="text-[13px] w-full">
                    <NextShift st={st} shopName={shopName} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-4 text-[13px] text-slate-500 flex items-start gap-2">
        <Clock size={15} className="shrink-0 mt-0.5" />
        Tocca una persona per aprire la scheda completa. Le ore si calcolano dagli orari delle fasce di ogni negozio.
      </p>

      <EmployeeDetail
        user={openUser}
        stats={openUser ? stats[openUser.id] ?? null : null}
        days={days}
        shops={shops}
        isMe={openUser?.id === currentUser.id}
        today={today}
        onClose={() => setOpenId(null)}
        onAction={onAction}
      />
      <UserFormModal user={editing?.user ?? null} mode={editing?.mode ?? 'edit'} shops={shops} onClose={() => setEditing(null)} />
      {confirm && confirmCopy && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await runConfirm();
            if (confirm.kind === 'delete') setOpenId(null);
          }}
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.label}
          tone={confirmCopy.tone}
        />
      )}
    </div>
  );
}

function PersonCell({ user, isMe }: { user: User; isMe: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar user={user} className={user.isBlocked ? 'grayscale' : ''} />
      <div className="min-w-0">
        <p className="font-bold text-slate-900 truncate">
          {fullName(user)} {isMe && <span className="text-[13px] font-medium text-slate-400">(tu)</span>}
        </p>
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {user.role === 'admin' && (
            <span className="chip bg-brand-100 text-brand-800 px-2 py-0.5 text-[11px]">
              <ShieldCheck size={11} /> Admin
            </span>
          )}
          {user.isBlocked && (
            <span className="chip bg-rose-100 text-rose-700 px-2 py-0.5 text-[11px]">
              <Ban size={11} /> Sospeso
            </span>
          )}
          <span className="text-[12px] text-slate-400 truncate">{user.email}</span>
        </div>
      </div>
    </div>
  );
}

function NextShift({ st, shopName }: { st?: StaffStats; shopName: (id: string) => string | undefined }) {
  if (!st?.next) return <span className="text-slate-300">Nessuno in programma</span>;
  const m = shiftMeta(st.next.shiftType);
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span className={cn('size-2.5 rounded-full shrink-0', m.dot)} />
      <span className="min-w-0">
        <span className="block font-semibold text-slate-800 whitespace-nowrap">
          {capitalize(fmt(st.next.date, 'EEE d MMM'))} · {m.label}
        </span>
        <span className="block text-[12px] text-slate-400 truncate">{shopName(st.next.shopId) ?? 'Negozio'}</span>
      </span>
    </span>
  );
}

function ShopChips({ ids, shopName }: { ids: string[]; shopName: (id: string) => string | undefined }) {
  const names = ids.map(shopName).filter((n): n is string => !!n);
  if (!names.length) return <span className="text-[13px] text-slate-300">Nessuno</span>;
  return (
    <div className="flex flex-wrap gap-1" title={names.join(', ')}>
      <span className="chip bg-white border border-slate-200 text-slate-700 px-2 py-0.5 text-[12px] whitespace-nowrap max-w-full">
        <Store size={11} className="text-brand-500 shrink-0" /> <span className="truncate">{names[0]}</span>
      </span>
      {names.length > 1 && (
        <span className="chip bg-slate-100 text-slate-600 px-2 py-0.5 text-[12px] whitespace-nowrap">+{names.length - 1}</span>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
  info,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: 'danger' | 'info';
  onClick?: () => void;
  info?: string;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <div className="relative">
      <Tag
        onClick={onClick}
        className={cn(
          'w-full h-full rounded-2xl p-3 text-left flex items-center gap-3 border',
          tone === 'danger' ? 'bg-rose-50 border-rose-200' : tone === 'info' ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 border-transparent',
          onClick && 'hover:brightness-[0.98]',
          info && 'pr-9',
        )}
      >
        <span
          className={cn(
            'size-9 rounded-xl flex items-center justify-center shrink-0',
            tone === 'danger' ? 'bg-rose-100 text-rose-600' : tone === 'info' ? 'bg-brand-100 text-brand-700' : 'bg-white text-slate-500',
          )}
        >
          <Icon size={18} />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-extrabold text-brand-950 tabular-nums leading-tight">{value}</span>
          <span className="block text-[12px] text-slate-500 leading-snug">{label}</span>
        </span>
      </Tag>
      {info && (
        <span className="absolute top-2 right-2">
          <InfoTip align="right">{info}</InfoTip>
        </span>
      )}
    </div>
  );
}

function Count({ n, warn, danger }: { n: number; warn?: boolean; danger?: boolean }) {
  return (
    <span
      className={cn(
        'min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center',
        danger ? 'bg-rose-500 text-white' : warn ? 'bg-amber-400 text-amber-950' : 'bg-slate-400/25',
      )}
    >
      {n}
    </span>
  );
}
