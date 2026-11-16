import { useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeftRight, Check, Loader2, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { shiftConflict, shiftMeta } from '../lib/shifts';
import { capitalize, cn, fmt, todayISO } from '../lib/utils';
import type { Shift, ShiftExchange, User } from '../types';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/Primitives';
import { useToast } from './ui/Toast';

interface Props {
  myShift: Shift | null;
  onClose: () => void;
  allShifts: Shift[];
  names: Record<string, string>;
  user: User;
}

export default function ShiftExchangeModal({ myShift, onClose, allShifts, names, user }: Props) {
  const toast = useToast();
  const [selected, setSelected] = useState<Shift | null>(null);
  const [busy, setBusy] = useState(false);

  const eligible = useMemo(() => {
    if (!myShift) return [];
    const today = todayISO();
    const without = (list: Shift[], id: string) => list.filter(s => s.id !== id);
    return allShifts
      .filter(s => s.userId !== user.id && s.shopId === myShift.shopId && s.date >= today)
      .filter(s => !(s.date === myShift.date && s.shiftType === myShift.shiftType))
      .filter(s => {
        // Dopo lo scambio nessuno dei due deve trovarsi con turni sovrapposti
        const mineThatDay = without(allShifts.filter(x => x.userId === user.id && x.date === s.date), myShift.id);
        const theirsOnMyDay = without(allShifts.filter(x => x.userId === s.userId && x.date === myShift.date), s.id);
        return !shiftConflict(mineThatDay, s.shiftType) && !shiftConflict(theirsOnMyDay, myShift.shiftType);
      })
      .sort((a, b) => a.date.localeCompare(b.date) || shiftMeta(a.shiftType).order - shiftMeta(b.shiftType).order);
  }, [allShifts, myShift, user.id]);

  const grouped = useMemo(() => {
    const map = new Map<string, Shift[]>();
    eligible.forEach(s => map.set(s.date, [...(map.get(s.date) ?? []), s]));
    return Array.from(map.entries());
  }, [eligible]);

  const close = () => {
    setSelected(null);
    onClose();
  };

  const propose = async () => {
    if (!myShift || !selected) return;
    setBusy(true);
    try {
      const dup = await getDocs(
        query(
          collection(db, 'shiftExchanges'),
          // Il filtro su requesterId serve alle regole di sicurezza: si leggono solo i propri scambi
          where('requesterId', '==', user.id),
          where('requesterShiftId', '==', myShift.id),
          where('targetShiftId', '==', selected.id),
          where('status', '==', 'pending'),
        ),
      );
      if (!dup.empty) {
        toast.info('Hai già proposto questo scambio: attendi la risposta del collega.');
        return;
      }
      await addDoc(collection(db, 'shiftExchanges'), {
        requesterId: user.id,
        requesterShiftId: myShift.id,
        targetUserId: selected.userId,
        targetShiftId: selected.id,
        shopId: myShift.shopId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      } satisfies Omit<ShiftExchange, 'id'>);
      toast.success(`Proposta inviata a ${names[selected.userId]?.split(' ')[0] ?? 'il collega'}.`);
      close();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const mine = myShift ? shiftMeta(myShift.shiftType) : null;

  return (
    <Modal
      open={!!myShift}
      onClose={close}
      locked={busy}
      title="Proponi uno scambio"
      description="Scegli il turno di un collega: riceverà la tua proposta e potrà accettarla o rifiutarla."
      footer={
        <>
          <button className="btn btn-secondary" onClick={close} disabled={busy}>
            Annulla
          </button>
          <button className="btn btn-primary" onClick={propose} disabled={!selected || busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Invia proposta
          </button>
        </>
      }
    >
      {myShift && mine && (
        <div className="space-y-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <SwapCard label="Cedi" title={capitalize(fmt(myShift.date, 'EEE d MMM'))} sub={mine.label} tone={mine.soft} />
            <span className="size-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
              <ArrowLeftRight size={16} />
            </span>
            {selected ? (
              <SwapCard
                label="Ricevi"
                title={capitalize(fmt(selected.date, 'EEE d MMM'))}
                sub={`${shiftMeta(selected.shiftType).label} · ${names[selected.userId]?.split(' ')[0] ?? 'Collega'}`}
                tone={shiftMeta(selected.shiftType).soft}
              />
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-3 text-center text-[13px] text-slate-400 h-full flex items-center justify-center">
                Seleziona un turno
              </div>
            )}
          </div>

          {grouped.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="Nessun turno disponibile"
              description="Non ci sono turni futuri dei colleghi compatibili con il tuo in questo negozio."
              className="py-6"
            />
          ) : (
            <div className="space-y-4">
              {grouped.map(([date, list]) => (
                <div key={date}>
                  <p className="eyebrow mb-2">{capitalize(fmt(date, 'EEEE d MMMM'))}</p>
                  <div className="space-y-1.5">
                    {list.map(s => {
                      const meta = shiftMeta(s.shiftType);
                      const on = selected?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelected(on ? null : s)}
                          aria-pressed={on}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-2xl border px-3 h-14 text-left transition-all',
                            on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                          )}
                        >
                          <span className={cn('size-9 rounded-xl flex items-center justify-center', meta.solid)}>
                            <meta.icon size={17} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold text-slate-800 truncate">{names[s.userId] ?? 'Collega'}</span>
                            <span className="block text-[13px] text-slate-500">{meta.label}</span>
                          </span>
                          {on && (
                            <span className="size-6 rounded-full bg-brand-600 text-white flex items-center justify-center">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function SwapCard({ label, title, sub, tone }: { label: string; title: string; sub: string; tone: string }) {
  return (
    <div className={cn('rounded-2xl border p-3 h-full', tone)}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="font-bold">{title}</p>
      <p className="text-[13px] opacity-80 truncate">{sub}</p>
    </div>
  );
}
