import { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, limit, orderBy, query, where } from 'firebase/firestore';
import { addDays, parseISO } from 'date-fns';
import {
  Users,
  Store,
  CalendarCheck2,
  UserPlus,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Hourglass,
  X,
  type LucideIcon,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { useApprovedUsers, useLiveQuery, usePendingUsers, useShops } from '../lib/hooks';
import { capitalize, cn, fmt, fullName, isShopClosed, toISODate } from '../lib/utils';
import { shiftMeta, sortShifts } from '../lib/shifts';
import type { ExchangeLog, Shift, User } from '../types';
import type { TabId } from './Layout';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState, Spinner } from './ui/Primitives';
import { useToast } from './ui/Toast';
import UserFormModal from './UserFormModal';

interface Props {
  user: User;
  onNavigate: (tab: TabId) => void;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

export default function AdminDashboard({ user, onNavigate }: Props) {
  const toast = useToast();
  const { data: shops, loading: shopsLoading } = useShops();
  const { data: staff } = useApprovedUsers();
  const { data: pending, loading: pendingLoading } = usePendingUsers();

  const today = toISODate(new Date());
  const horizon = useMemo(() => Array.from({ length: 7 }, (_, i) => toISODate(addDays(new Date(), i))), []);
  const { data: weekShifts } = useLiveQuery<Shift>(
    () => query(collection(db, 'shifts'), where('date', '>=', horizon[0]), where('date', '<=', horizon[6])),
    `dash-shifts-${horizon[0]}`,
  );
  const { data: logs } = useLiveQuery<ExchangeLog & { id: string }>(
    () => query(collection(db, 'exchangeLogs'), orderBy('acceptedAt', 'desc'), limit(5)),
    'dash-logs',
  );

  const [approving, setApproving] = useState<User | null>(null);
  const [rejecting, setRejecting] = useState<User | null>(null);

  const staffById = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);
  const shopById = useMemo(() => Object.fromEntries(shops.map(s => [s.id, s])), [shops]);
  const todayShifts = weekShifts.filter(s => s.date === today);
  const activeStaff = staff.filter(s => !s.isBlocked);

  // Giorni di apertura senza nessun turno nei prossimi 7 giorni
  const gaps = useMemo(() => {
    const out: { shopId: string; date: string }[] = [];
    for (const shop of shops) {
      for (const d of horizon) {
        if (isShopClosed(shop, d) || parseISO(d).getDay() === 0) continue; // domenica: chiusura standard
        if (!weekShifts.some(s => s.shopId === shop.id && s.date === d)) out.push({ shopId: shop.id, date: d });
      }
    }
    return out;
  }, [shops, horizon, weekShifts]);

  const reject = async () => {
    if (!rejecting) return;
    try {
      await deleteDoc(doc(db, 'users', rejecting.id));
      toast.success('Richiesta rifiutata.');
    } catch (err) {
      toast.error(err);
    }
  };

  if (shopsLoading && pendingLoading) return <Spinner label="Caricamento panoramica…" />;

  return (
    <div className="space-y-6">
      {/* Intestazione */}
      <section className="relative overflow-hidden rounded-[28px] bg-brand-800 bubbles text-white p-6 md:p-8">
        <div className="absolute -right-16 -top-16 size-64 rounded-full bg-brand-500/30 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-brand-100/80">{capitalize(fmt(new Date(), 'EEEE d MMMM yyyy'))}</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">
              {greeting()}, {user.nome}
            </h1>
            <p className="mt-2 text-brand-100/90 max-w-lg">
              {todayShifts.length > 0
                ? `Oggi sono previsti ${todayShifts.length} turni in ${new Set(todayShifts.map(s => s.shopId)).size} negozi.`
                : 'Oggi non ci sono turni programmati.'}
              {pending.length > 0 && ` ${pending.length === 1 ? 'Una nuova richiesta' : `${pending.length} nuove richieste`} di accesso da gestire.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn bg-white text-brand-800 hover:bg-brand-50" onClick={() => onNavigate('planner')}>
              <CalendarRange size={18} /> Pianifica turni
            </button>
            <button className="btn bg-white/10 text-white hover:bg-white/20" onClick={() => onNavigate('shops')}>
              <Store size={18} /> Negozi
            </button>
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi icon={Users} label="Personale attivo" value={activeStaff.length} onClick={() => onNavigate('staff')} />
        <Kpi icon={Store} label="Negozi" value={shops.length} onClick={() => onNavigate('shops')} />
        <Kpi icon={CalendarCheck2} label="Turni oggi" value={todayShifts.length} onClick={() => onNavigate('schedule')} />
        <Kpi
          icon={UserPlus}
          label="Richieste di accesso"
          value={pending.length}
          highlight={pending.length > 0}
          onClick={() => document.getElementById('approvals')?.scrollIntoView({ behavior: 'smooth' })}
        />
      </section>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Colonna sinistra */}
        <div className="lg:col-span-3 space-y-6">
          {/* Oggi nei negozi */}
          <section className="card">
            <header className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h2 className="font-bold text-slate-900">Oggi nei negozi</h2>
                <p className="text-sm text-slate-500">Chi è in servizio e dove</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('schedule')}>
                Agenda <ArrowRight size={16} />
              </button>
            </header>
            {shops.length === 0 ? (
              <EmptyState
                icon={Store}
                title="Nessun negozio configurato"
                description="Crea il primo punto vendita per iniziare a pianificare i turni."
                action={<button className="btn btn-primary" onClick={() => onNavigate('shops')}>Crea negozio</button>}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {shops.map(shop => {
                  const list = sortShifts(todayShifts.filter(s => s.shopId === shop.id));
                  const closed = isShopClosed(shop, today);
                  return (
                    <li key={shop.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 sm:w-60 shrink-0">
                        <span className="size-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                          <Store size={18} />
                        </span>
                        <p className="font-semibold text-slate-800 line-clamp-2">{shop.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 flex-1">
                        {closed ? (
                          <span className="chip bg-rose-50 text-rose-700">Chiuso per festività</span>
                        ) : list.length === 0 ? (
                          <span className="chip bg-amber-50 text-amber-700">
                            <AlertTriangle size={13} /> Nessun turno
                          </span>
                        ) : (
                          list.map(s => {
                            const meta = shiftMeta(s.shiftType);
                            return (
                              <span key={s.id} className={cn('chip border', meta.soft)}>
                                <meta.icon size={13} />
                                {staffById[s.userId] ? staffById[s.userId].nome : 'Utente rimosso'}
                                <span className="font-medium opacity-70">· {meta.label}</span>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Scoperture */}
          {shops.length > 0 && (
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-slate-900">Prossimi 7 giorni</h2>
                  <p className="text-sm text-slate-500">Giorni di apertura senza personale assegnato</p>
                </div>
                {gaps.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('planner')}>
                    Risolvi
                  </button>
                )}
              </div>
              {gaps.length === 0 ? (
                <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  <CheckCircle2 size={18} /> Tutti i negozi sono coperti per la prossima settimana.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gaps.slice(0, 12).map(g => (
                    <span key={g.shopId + g.date} className="chip bg-amber-50 text-amber-800 border border-amber-200">
                      <AlertTriangle size={13} />
                      {shopById[g.shopId]?.name} · {capitalize(fmt(g.date, 'EEE d MMM'))}
                    </span>
                  ))}
                  {gaps.length > 12 && <span className="chip bg-slate-100 text-slate-600">+{gaps.length - 12} altri</span>}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Colonna destra */}
        <div className="lg:col-span-2 space-y-6">
          <section id="approvals" className="card scroll-mt-24">
            <header className="flex items-center gap-2 px-5 pt-5 pb-3">
              <h2 className="font-bold text-slate-900 flex-1">Richieste di accesso</h2>
              {pending.length > 0 && <span className="chip bg-amber-100 text-amber-800">{pending.length}</span>}
            </header>
            {pending.length === 0 ? (
              <EmptyState icon={Hourglass} title="Nessuna richiesta" description="Le nuove registrazioni compariranno qui." className="py-8" />
            ) : (
              <ul className="px-3 pb-3 space-y-1">
                {pending.map(p => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-slate-50">
                    <Avatar user={p} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate">{fullName(p)}</p>
                      <p className="text-[13px] text-slate-500 truncate">{p.email}</p>
                    </div>
                    <button className="btn-icon text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label={`Rifiuta ${fullName(p)}`} onClick={() => setRejecting(p)}>
                      <X size={18} />
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setApproving(p)}>
                      Approva
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <header className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="font-bold text-slate-900">Ultimi scambi</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('exchanges')}>
                Tutti <ArrowRight size={16} />
              </button>
            </header>
            {logs.length === 0 ? (
              <EmptyState icon={ArrowLeftRight} title="Nessuno scambio" description="Gli scambi accettati tra colleghi compariranno qui." className="py-8" />
            ) : (
              <ul className="px-5 pb-4 divide-y divide-slate-100">
                {logs.map(l => (
                  <li key={l.id} className="py-3 text-sm">
                    <p className="font-semibold text-slate-800">
                      {l.requesterName.split(' ')[0]} <ArrowLeftRight size={13} className="inline text-brand-500 mx-1" /> {l.targetUserName.split(' ')[0]}
                    </p>
                    <p className="text-slate-500 text-[13px]">
                      {shopById[l.shopId]?.name ?? 'Negozio'} · {fmt(l.acceptedAt, "d MMM 'alle' HH:mm")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <UserFormModal user={approving} shops={shops} mode="approve" onClose={() => setApproving(null)} />
      <ConfirmDialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={reject}
        title="Rifiutare la richiesta?"
        message={
          <>
            Il profilo di <strong className="text-slate-700">{fullName(rejecting)}</strong> verrà eliminato. La persona potrà
            comunque registrarsi di nuovo in futuro.
          </>
        }
        confirmLabel="Rifiuta richiesta"
      />
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  highlight,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'card p-4 md:p-5 text-left transition-all hover:shadow-lift hover:-translate-y-0.5',
        highlight && 'border-amber-300 bg-amber-50/60',
      )}
    >
      <span
        className={cn(
          'size-10 rounded-2xl flex items-center justify-center',
          highlight ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-600',
        )}
      >
        <Icon size={20} />
      </span>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-brand-950">{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </button>
  );
}
