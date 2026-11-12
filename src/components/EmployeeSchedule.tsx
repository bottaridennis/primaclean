import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { addWeeks, differenceInCalendarDays, isSameDay, parseISO } from 'date-fns';
import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, Shirt, Store, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { useApprovedUsers, useLiveQuery, useShopMembers, useShops } from '../lib/hooks';
import { SHIFT_TYPE_LIST, shiftMeta, sortShifts } from '../lib/shifts';
import { capitalize, cn, fmt, fullName, isShopClosed, toISODate, todayISO, weekDays, weekLabel } from '../lib/utils';
import type { Shift, User } from '../types';
import { EmptyState, PageHeader, PillTabs, Segmented, Spinner } from './ui/Primitives';
import PendingExchanges from './PendingExchanges';
import ShiftExchangeModal from './ShiftExchangeModal';

interface Props {
  user: User;
}

export default function EmployeeSchedule({ user }: Props) {
  const isAdmin = user.role === 'admin';
  const canSeeAll = isAdmin || user.canSeeColleagues;
  const canExchange = canSeeAll;

  const { data: allShops, loading: shopsLoading } = useShops();
  const shops = useMemo(
    () => (isAdmin ? allShops : allShops.filter(s => (user.shopIds ?? []).includes(s.id))),
    [allShops, isAdmin, user.shopIds],
  );

  const [shopId, setShopId] = useState('');
  const [anchor, setAnchor] = useState(() => new Date());
  const [onlyMine, setOnlyMine] = useState<'all' | 'mine'>(canSeeAll ? 'all' : 'mine');
  const [exchangeShift, setExchangeShift] = useState<Shift | null>(null);

  useEffect(() => {
    if (shops.length && !shops.some(s => s.id === shopId)) setShopId(shops[0].id);
  }, [shops, shopId]);

  const shop = shops.find(s => s.id === shopId);
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const today = todayISO();

  const { data: shifts, loading } = useLiveQuery<Shift>(
    shopId
      ? () =>
          canSeeAll
            ? query(collection(db, 'shifts'), where('shopId', '==', shopId))
            : query(collection(db, 'shifts'), where('shopId', '==', shopId), where('userId', '==', user.id))
      : null,
    `schedule-${shopId}-${canSeeAll}-${user.id}`,
  );

  // Nomi: l'admin vede tutto il personale, il dipendente i colleghi del negozio
  const { data: members } = useShopMembers(isAdmin ? null : shopId);
  const { data: everyone } = useApprovedUsers(isAdmin);
  const names = useMemo(() => {
    const out: Record<string, string> = {};
    (isAdmin ? everyone : members).forEach(u => (out[u.id] = fullName(u)));
    out[user.id] = fullName(user);
    return out;
  }, [isAdmin, everyone, members, user]);
  const shopNames = useMemo(() => Object.fromEntries(allShops.map(s => [s.id, s.name])), [allShops]);

  const myUpcoming = useMemo(
    () =>
      shifts
        .filter(s => s.userId === user.id && s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || shiftMeta(a.shiftType).order - shiftMeta(b.shiftType).order),
    [shifts, user.id, today],
  );
  const nextShift = myUpcoming[0];

  const isoDays = days.map(toISODate);
  const myWeekCount = shifts.filter(s => s.userId === user.id && isoDays.includes(s.date)).length;

  const dayShifts = (iso: string) => {
    const list = shifts.filter(s => s.date === iso && (onlyMine === 'all' || s.userId === user.id));
    // I miei turni in cima, poi in ordine di fascia
    return sortShifts(list).sort((a, b) => Number(b.userId === user.id) - Number(a.userId === user.id));
  };

  if (shopsLoading) return <Spinner label="Caricamento agenda…" />;

  if (shops.length === 0) {
    return (
      <div>
        <PageHeader title={isAdmin ? 'Agenda negozi' : 'I miei turni'} />
        <div className="card">
          <EmptyState
            icon={Store}
            title={isAdmin ? 'Nessun negozio configurato' : 'Non sei ancora assegnato a un negozio'}
            description={isAdmin ? 'Crea un negozio dalla sezione «Negozi e chiusure».' : 'Contatta il tuo responsabile per essere assegnato a un punto vendita.'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isAdmin ? 'Agenda negozi' : `Ciao, ${user.nome}`}
        description={isAdmin ? 'Vista settimanale dei turni per ogni punto vendita.' : 'Ecco la tua agenda di lavoro.'}
      />

      {/* Prossimo turno */}
      {!isAdmin && (
        <section className="relative overflow-hidden rounded-[28px] bg-brand-800 bubbles text-white p-5 sm:p-6">
          <div className="absolute -right-10 -bottom-10 size-48 rounded-full bg-brand-500/30 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <span className="size-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              {nextShift ? (() => { const I = shiftMeta(nextShift.shiftType).icon; return <I size={26} />; })() : <Shirt size={26} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-100/80">Il tuo prossimo turno · {shop?.name}</p>
              {nextShift ? (
                <>
                  <p className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {relativeDay(nextShift.date)} · {shiftMeta(nextShift.shiftType).label}
                  </p>
                  <p className="text-sm text-brand-100/80">{capitalize(fmt(nextShift.date, 'EEEE d MMMM'))}</p>
                </>
              ) : (
                <p className="text-xl font-extrabold">Nessun turno in programma</p>
              )}
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-3xl font-extrabold">{myWeekCount}</p>
              <p className="text-sm text-brand-100/80">turni in settimana</p>
            </div>
          </div>
        </section>
      )}

      <PendingExchanges user={user} names={names} shopNames={shopNames} />

      {shops.length > 1 && (
        <PillTabs ariaLabel="Negozio" value={shopId} onChange={setShopId} options={shops.map(s => ({ value: s.id, label: s.name }))} />
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4 border-b border-slate-100">
          <button className="btn-icon" onClick={() => setAnchor(a => addWeeks(a, -1))} aria-label="Settimana precedente">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-40 text-center sm:text-left">
            <p className="font-bold text-slate-900">{weekLabel(days)}</p>
            <p className="text-[13px] text-slate-500">{shop?.name}</p>
          </div>
          <button className="btn-icon" onClick={() => setAnchor(a => addWeeks(a, 1))} aria-label="Settimana successiva">
            <ChevronRight size={20} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setAnchor(new Date())} disabled={days.some(d => isSameDay(d, new Date()))}>
            Oggi
          </button>
          {canSeeAll && (
            <Segmented<'all' | 'mine'>
              className="w-full sm:w-auto sm:ml-2"
              value={onlyMine}
              onChange={setOnlyMine}
              options={[
                { value: 'all', label: <><Users size={15} /> Tutti</> },
                { value: 'mine', label: 'Solo i miei' },
              ]}
            />
          )}
        </div>

        {loading ? (
          <Spinner className="py-20" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 md:divide-x divide-slate-100">
            {days.map(day => {
              const iso = toISODate(day);
              const isToday = iso === today;
              const isPast = iso < today;
              const closed = isShopClosed(shop, iso);
              const list = dayShifts(iso);
              return (
                <div
                  key={iso}
                  className={cn(
                    'flex md:flex-col border-b md:border-b-0 border-slate-100 last:border-b-0 md:min-h-[340px]',
                    isToday && 'bg-brand-50/50',
                    isPast && 'opacity-60',
                    closed && 'striped-closed',
                  )}
                >
                  <div className="w-20 md:w-auto shrink-0 px-3 py-4 md:py-3 md:text-center md:border-b md:border-slate-100">
                    <p className={cn('text-xs font-semibold uppercase tracking-wide', isToday ? 'text-brand-600' : 'text-slate-400')}>
                      {fmt(day, 'EEE')}
                    </p>
                    <p className={cn('text-2xl font-extrabold leading-tight', isToday ? 'text-brand-700' : 'text-slate-800')}>{fmt(day, 'd')}</p>
                    {isToday && <span className="chip bg-brand-600 text-white text-[10px] px-2 py-0.5 mt-0.5">Oggi</span>}
                  </div>
                  <div className="flex-1 p-2.5 space-y-2 min-w-0">
                    {closed ? (
                      <p className="h-full min-h-12 flex items-center md:justify-center gap-1.5 text-sm font-semibold text-rose-600">
                        <Store size={16} /> Chiuso
                      </p>
                    ) : list.length === 0 ? (
                      <p className="h-full min-h-12 flex items-center md:justify-center text-sm text-slate-300">
                        {onlyMine === 'mine' || !canSeeAll ? 'Riposo' : 'Nessun turno'}
                      </p>
                    ) : (
                      list.map(s => {
                        const meta = shiftMeta(s.shiftType);
                        const mine = s.userId === user.id;
                        const exchangeable = mine && canExchange && s.date >= today;
                        return (
                          <div key={s.id} className={cn('rounded-2xl p-2.5 border', mine ? cn(meta.solid, 'border-transparent shadow-sm') : meta.soft)}>
                            <p className={cn('text-[12px] font-semibold truncate', mine ? 'text-white/80' : 'opacity-80')}>
                              {mine ? 'Il tuo turno' : names[s.userId] ?? 'Collega'}
                            </p>
                            <p className="text-sm font-bold flex items-center gap-1.5">
                              <meta.icon size={14} /> {meta.label}
                            </p>
                            {exchangeable && (
                              <button
                                onClick={() => setExchangeShift(s)}
                                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 h-8 text-xs font-semibold transition-colors"
                              >
                                <ArrowLeftRight size={13} /> Scambia
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-500">
        {SHIFT_TYPE_LIST.map(m => (
          <span key={m.type} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', m.dot)} /> {m.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={14} /> Le colonne a righe rosse indicano i giorni di chiusura
        </span>
      </div>

      {!canExchange && !isAdmin && (
        <p className="text-[13px] text-slate-400">
          Per proporre scambi di turno ai colleghi chiedi al responsabile di abilitare la visibilità dei turni del negozio.
        </p>
      )}

      <ShiftExchangeModal myShift={exchangeShift} onClose={() => setExchangeShift(null)} allShifts={shifts} names={names} user={user} />
    </div>
  );
}

function relativeDay(iso: string) {
  const diff = differenceInCalendarDays(parseISO(iso), new Date());
  if (diff === 0) return 'Oggi';
  if (diff === 1) return 'Domani';
  if (diff < 7) return capitalize(fmt(iso, 'EEEE'));
  return capitalize(fmt(iso, 'd MMMM'));
}
