import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, Check, Clock, Loader2, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/hooks';
import { shiftMeta } from '../lib/shifts';
import { capitalize, cn, fmt, todayISO } from '../lib/utils';
import type { Shift, ShiftExchange, User } from '../types';
import { useToast } from './ui/Toast';

interface Props {
  user: User;
  /** Nomi già noti (es. colleghi del negozio attivo) */
  names: Record<string, string>;
  shopNames: Record<string, string>;
}

type ShiftCache = Record<string, Shift | null>;

export default function PendingExchanges({ user, names: knownNames, shopNames }: Props) {
  const toast = useToast();
  const enabled = user.isApproved || user.role === 'admin';

  // Due liste separate: così quando uno scambio esce da "pending" sparisce davvero
  const { data: incoming } = useLiveQuery<ShiftExchange>(
    enabled
      ? () => query(collection(db, 'shiftExchanges'), where('targetUserId', '==', user.id), where('status', '==', 'pending'))
      : null,
    `ex-in-${user.id}-${enabled}`,
  );
  const { data: outgoing } = useLiveQuery<ShiftExchange>(
    enabled
      ? () => query(collection(db, 'shiftExchanges'), where('requesterId', '==', user.id), where('status', '==', 'pending'))
      : null,
    `ex-out-${user.id}-${enabled}`,
  );

  const exchanges = useMemo(
    () => [...incoming, ...outgoing].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    [incoming, outgoing],
  );

  const [shifts, setShifts] = useState<ShiftCache>({});
  const [extraNames, setExtraNames] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const names = { ...extraNames, ...knownNames };

  // Carica i turni coinvolti (anche ricaricandoli quando la lista cambia, per avere dati aggiornati)
  const shiftKey = exchanges.map(e => `${e.requesterShiftId}|${e.targetShiftId}`).join(',');
  useEffect(() => {
    if (!exchanges.length) return;
    let cancelled = false;
    const ids = Array.from(new Set(exchanges.flatMap(e => [e.requesterShiftId, e.targetShiftId])));
    Promise.all(
      ids.map(async id => {
        try {
          const snap = await getDoc(doc(db, 'shifts', id));
          return [id, snap.exists() ? ({ id: snap.id, ...snap.data() } as Shift) : null] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then(entries => !cancelled && setShifts(Object.fromEntries(entries)));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftKey]);

  // Recupera i nomi dei colleghi di altri negozi
  const shopKey = Array.from(new Set(exchanges.map(e => e.shopId))).sort().join(',');
  useEffect(() => {
    if (!shopKey) return;
    shopKey.split(',').forEach(async shopId => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('shopIds', 'array-contains', shopId)));
        const found: Record<string, string> = {};
        snap.forEach(d => (found[d.id] = `${d.data().nome} ${d.data().cognome}`));
        setExtraNames(prev => ({ ...prev, ...found }));
      } catch {
        /* nomi non disponibili: verrà mostrato "Collega" */
      }
    });
  }, [shopKey]);

  const isValid = (e: ShiftExchange, cache: ShiftCache = shifts) => {
    const req = cache[e.requesterShiftId];
    const tgt = cache[e.targetShiftId];
    const today = todayISO();
    return !!req && !!tgt && req.userId === e.requesterId && tgt.userId === e.targetUserId && req.date >= today && tgt.date >= today;
  };

  const setStatus = async (e: ShiftExchange, status: 'rejected', msg: string) => {
    setBusyId(e.id);
    try {
      await updateDoc(doc(db, 'shiftExchanges', e.id), { status });
      toast.success(msg);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusyId(null);
    }
  };

  const accept = async (e: ShiftExchange) => {
    setBusyId(e.id);
    try {
      // Rilegge i turni per evitare di scambiare dati non più attuali
      const [reqSnap, tgtSnap] = await Promise.all([
        getDoc(doc(db, 'shifts', e.requesterShiftId)),
        getDoc(doc(db, 'shifts', e.targetShiftId)),
      ]);
      const fresh: ShiftCache = {
        [e.requesterShiftId]: reqSnap.exists() ? ({ id: reqSnap.id, ...reqSnap.data() } as Shift) : null,
        [e.targetShiftId]: tgtSnap.exists() ? ({ id: tgtSnap.id, ...tgtSnap.data() } as Shift) : null,
      };
      if (!isValid(e, fresh)) {
        await updateDoc(doc(db, 'shiftExchanges', e.id), { status: 'rejected' });
        toast.error('Uno dei turni è stato modificato nel frattempo: lo scambio non è più valido.');
        return;
      }
      const req = fresh[e.requesterShiftId]!;
      const tgt = fresh[e.targetShiftId]!;
      const batch = writeBatch(db);
      batch.update(doc(db, 'shiftExchanges', e.id), { status: 'accepted' });
      batch.update(doc(db, 'shifts', req.id), { userId: e.targetUserId });
      batch.update(doc(db, 'shifts', tgt.id), { userId: e.requesterId });
      batch.set(doc(collection(db, 'exchangeLogs')), {
        requesterId: e.requesterId,
        requesterName: names[e.requesterId] ?? 'Sconosciuto',
        targetUserId: e.targetUserId,
        targetUserName: names[e.targetUserId] ?? `${user.nome} ${user.cognome}`,
        requesterShiftDate: req.date,
        requesterShiftType: req.shiftType,
        targetShiftDate: tgt.date,
        targetShiftType: tgt.shiftType,
        shopId: e.shopId,
        acceptedAt: new Date().toISOString(),
      });
      await batch.commit();
      toast.success('Scambio accettato: la tua agenda è stata aggiornata.');
    } catch (err) {
      toast.error(err);
    } finally {
      setBusyId(null);
    }
  };

  if (exchanges.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Scambi di turno in attesa">
      <AnimatePresence initial={false}>
        {exchanges.map(e => {
          const isRequester = e.requesterId === user.id;
          const myShift = shifts[isRequester ? e.requesterShiftId : e.targetShiftId];
          const theirShift = shifts[isRequester ? e.targetShiftId : e.requesterShiftId];
          const otherName = names[isRequester ? e.targetUserId : e.requesterId] ?? 'Un collega';
          const loaded = e.requesterShiftId in shifts && e.targetShiftId in shifts;
          const valid = loaded && isValid(e);
          const busy = busyId === e.id;

          return (
            <motion.article
              key={e.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className={cn(
                'card overflow-hidden border-l-4',
                isRequester ? 'border-l-slate-300' : 'border-l-brand-500',
              )}
            >
              <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-3 lg:w-64 shrink-0">
                  <span
                    className={cn(
                      'size-10 rounded-2xl flex items-center justify-center shrink-0',
                      isRequester ? 'bg-slate-100 text-slate-500' : 'bg-brand-100 text-brand-700',
                    )}
                  >
                    {isRequester ? <Clock size={19} /> : <ArrowLeftRight size={19} />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {isRequester ? 'Proposta in attesa' : `${otherName.split(' ')[0]} ti propone uno scambio`}
                    </p>
                    <p className="text-[13px] text-slate-500 truncate">
                      {isRequester ? `In attesa di risposta da ${otherName}` : shopNames[e.shopId] ?? ''}
                    </p>
                  </div>
                </div>

                {!loaded ? (
                  <div className="flex-1 flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={16} className="animate-spin" /> Caricamento dettagli…
                  </div>
                ) : !valid ? (
                  <p className="flex-1 text-sm text-slate-500">
                    Questo scambio non è più valido: uno dei turni è stato modificato, eliminato o è già passato.
                  </p>
                ) : (
                  <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <ShiftBox label="Cedi" shift={myShift!} />
                    <ArrowLeftRight size={16} className="text-slate-400" />
                    <ShiftBox label="Ricevi" shift={theirShift!} />
                  </div>
                )}

                <div className="flex gap-2 lg:w-auto">
                  {isRequester || !valid ? (
                    <button
                      className="btn btn-secondary flex-1 lg:flex-none"
                      disabled={busy}
                      onClick={() => setStatus(e, 'rejected', valid ? 'Proposta annullata.' : 'Scambio rimosso.')}
                    >
                      {busy && <Loader2 size={16} className="animate-spin" />}
                      {valid ? 'Annulla proposta' : 'Rimuovi'}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn btn-secondary"
                        disabled={busy}
                        onClick={() => setStatus(e, 'rejected', 'Proposta rifiutata.')}
                        aria-label="Rifiuta scambio"
                      >
                        <X size={17} /> <span className="lg:hidden xl:inline">Rifiuta</span>
                      </button>
                      <button className="btn btn-primary flex-1 lg:flex-none" disabled={busy} onClick={() => accept(e)}>
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={17} />} Accetta
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </section>
  );
}

function ShiftBox({ label, shift }: { label: string; shift: Shift }) {
  const meta = shiftMeta(shift.shiftType);
  return (
    <div className={cn('rounded-2xl border px-3 py-2', meta.soft)}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="font-bold text-sm">{capitalize(fmt(shift.date, 'EEE d MMM'))}</p>
      <p className="text-[13px] opacity-80 flex items-center gap-1">
        <meta.icon size={12} /> {meta.label}
      </p>
    </div>
  );
}
