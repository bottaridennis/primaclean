import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { addDays, addWeeks, isSameDay, parseISO } from 'date-fns';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Copy, Loader2, Plus, Store, Trash2, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { useApprovedUsers, useLiveQuery, useShops } from '../lib/hooks';
import { SHIFT_TYPE_LIST, shiftConflict, shiftMeta, sortShifts } from '../lib/shifts';
import { capitalize, cn, fmt, fullName, isShopClosed, toISODate, weekDays, weekLabel } from '../lib/utils';
import type { Shift, ShiftType, User } from '../types';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Modal } from './ui/Modal';
import { EmptyState, PageHeader, PillTabs, Spinner } from './ui/Primitives';
import { useToast } from './ui/Toast';

interface CellRef {
  user: User | { id: string; nome: string; cognome: string };
  date: string;
}

export default function ShiftCreator() {
  const toast = useToast();
  const { data: shops, loading: shopsLoading } = useShops();
  const { data: staff } = useApprovedUsers();
  const [shopId, setShopId] = useState('');
  const [anchor, setAnchor] = useState(() => new Date());
  const [cell, setCell] = useState<CellRef | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  useEffect(() => {
    if (!shopId && shops.length) setShopId(shops[0].id);
    if (shopId && shops.length && !shops.some(s => s.id === shopId)) setShopId(shops[0].id);
  }, [shops, shopId]);

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const isoDays = useMemo(() => days.map(toISODate), [days]);
  const shop = shops.find(s => s.id === shopId);

  // Tutti i turni della settimana (tutte le sedi) per poter rilevare i conflitti tra negozi
  const { data: weekShifts, loading: shiftsLoading } = useLiveQuery<Shift>(
    () => query(collection(db, 'shifts'), where('date', '>=', isoDays[0]), where('date', '<=', isoDays[6])),
    `planner-${isoDays[0]}`,
  );

  const shopShifts = useMemo(() => weekShifts.filter(s => s.shopId === shopId), [weekShifts, shopId]);
  const staffById = useMemo(() => Object.fromEntries(staff.map(u => [u.id, u])), [staff]);

  // Righe: personale assegnato al negozio + chi ha turni qui pur non essendo più assegnato
  const rows = useMemo(() => {
    const assigned = staff.filter(u => (u.shopIds ?? []).includes(shopId) && !u.isBlocked);
    const extraIds = Array.from(new Set(shopShifts.map(s => s.userId))).filter(id => !assigned.some(u => u.id === id));
    const extra = extraIds.map(id => staffById[id] ?? { id, nome: 'Utente', cognome: 'rimosso' });
    return [...assigned, ...extra] as CellRef['user'][];
  }, [staff, shopId, shopShifts, staffById]);

  const assignedIds = new Set(staff.filter(u => (u.shopIds ?? []).includes(shopId)).map(u => u.id));
  const shiftsOf = (userId: string, date: string) => weekShifts.filter(s => s.userId === userId && s.date === date);

  const addShift = async (userId: string, date: string, type: ShiftType) => {
    const conflict = shiftConflict(shiftsOf(userId, date), type);
    if (conflict) return toast.error(conflict);
    try {
      await addDoc(collection(db, 'shifts'), { userId, shopId, date, shiftType: type });
    } catch (err) {
      toast.error(err);
    }
  };

  const removeShift = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shifts', id));
    } catch (err) {
      toast.error(err);
    }
  };

  const copyPreviousWeek = async () => {
    const prev = weekDays(addWeeks(anchor, -1)).map(toISODate);
    const snap = await getDocs(query(collection(db, 'shifts'), where('date', '>=', prev[0]), where('date', '<=', prev[6])));
    const source = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Shift).filter(s => s.shopId === shopId);
    if (source.length === 0) {
      toast.info('La settimana precedente non ha turni da copiare.');
      return;
    }
    const planned: Shift[] = [...weekShifts];
    const batch = writeBatch(db);
    let added = 0;
    let skipped = 0;
    for (const s of source) {
      const date = toISODate(addDays(parseISO(s.date), 7));
      const user = staffById[s.userId];
      const existing = planned.filter(p => p.userId === s.userId && p.date === date);
      if (!user || user.isBlocked || isShopClosed(shop, date) || shiftConflict(existing, s.shiftType)) {
        skipped++;
        continue;
      }
      const ref = doc(collection(db, 'shifts'));
      const copy = { userId: s.userId, shopId, date, shiftType: s.shiftType };
      batch.set(ref, copy);
      planned.push({ id: ref.id, ...copy });
      added++;
    }
    if (added === 0) {
      toast.info('Nessun turno da copiare: sono già tutti presenti o in conflitto.');
      return;
    }
    try {
      await batch.commit();
      toast.success(`Copiati ${added} turni${skipped ? ` (${skipped} saltati per conflitti o chiusure)` : ''}.`);
    } catch (err) {
      toast.error(err);
    }
  };

  if (shopsLoading) return <Spinner label="Caricamento planner…" />;

  if (shops.length === 0) {
    return (
      <div>
        <PageHeader title="Planner turni" />
        <div className="card">
          <EmptyState icon={Store} title="Nessun negozio" description="Crea almeno un negozio per iniziare a pianificare i turni." />
        </div>
      </div>
    );
  }

  const today = new Date();
  const cellShifts = cell ? shiftsOf(cell.user.id, cell.date) : [];

  return (
    <div>
      <PageHeader
        title="Planner turni"
        description="Tocca una casella per assegnare o rimuovere un turno. Le modifiche sono visibili subito al personale."
        actions={
          <button className="btn btn-secondary" onClick={() => setCopyOpen(true)}>
            <Copy size={17} /> Copia settimana precedente
          </button>
        }
      />

      <PillTabs
        className="mb-4"
        ariaLabel="Negozio"
        value={shopId}
        onChange={setShopId}
        options={shops.map(s => ({ value: s.id, label: s.name }))}
      />

      <div className="card overflow-hidden">
        {/* Navigazione settimana */}
        <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-slate-100">
          <button className="btn-icon" onClick={() => setAnchor(a => addWeeks(a, -1))} aria-label="Settimana precedente">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 text-center">
            <p className="font-bold text-slate-900">{weekLabel(days)}</p>
            <p className="text-[13px] text-slate-500">
              {shopShifts.length} turni · {rows.length} persone
            </p>
          </div>
          <button className="btn-icon" onClick={() => setAnchor(a => addWeeks(a, 1))} aria-label="Settimana successiva">
            <ChevronRight size={20} />
          </button>
          <button className="btn btn-secondary btn-sm hidden sm:inline-flex" onClick={() => setAnchor(new Date())} disabled={days.some(d => isSameDay(d, today))}>
            Oggi
          </button>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nessun dipendente assegnato"
            description="Assegna del personale a questo negozio dalla sezione «Personale» per poter creare i turni."
          />
        ) : (
          <div className="overflow-x-auto relative">
            {shiftsLoading && <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-400 animate-pulse" />}
            <table className="w-full border-collapse text-sm min-w-[860px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-white w-44 min-w-44 text-left px-4 py-3 text-xs font-semibold text-slate-400 border-b border-slate-100">
                    Personale
                  </th>
                  {days.map((d, i) => {
                    const closed = isShopClosed(shop, isoDays[i]);
                    const isToday = isSameDay(d, today);
                    return (
                      <th
                        key={isoDays[i]}
                        className={cn('px-2 py-3 border-b border-l border-slate-100 font-normal', closed && 'bg-rose-50/60', isToday && 'bg-brand-50/70')}
                      >
                        <p className={cn('text-xs font-semibold uppercase tracking-wide', isToday ? 'text-brand-600' : 'text-slate-400')}>{fmt(d, 'EEE')}</p>
                        <p className={cn('text-lg font-extrabold', isToday ? 'text-brand-700' : 'text-slate-800')}>{fmt(d, 'd')}</p>
                        {closed && <p className="text-[11px] font-semibold text-rose-600">Chiuso</p>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(u => (
                  <tr key={u.id} className="group">
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar user={u} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{fullName(u)}</p>
                          {!assignedIds.has(u.id) && <p className="text-[11px] text-amber-600 font-medium">Non più assegnato</p>}
                        </div>
                      </div>
                    </td>
                    {isoDays.map(date => {
                      const closed = isShopClosed(shop, date);
                      const mine = sortShifts(shiftsOf(u.id, date));
                      const here = mine.filter(s => s.shopId === shopId);
                      const elsewhere = mine.filter(s => s.shopId !== shopId);
                      return (
                        <td key={date} className={cn('border-b border-l border-slate-100 p-1.5 align-top', closed && 'striped-closed')}>
                          <button
                            onClick={() => setCell({ user: u, date })}
                            disabled={closed && here.length === 0}
                            className={cn(
                              'w-full min-h-14 rounded-xl p-1 flex flex-col gap-1 items-stretch transition-colors text-left',
                              'hover:bg-brand-50 focus-visible:bg-brand-50 disabled:hover:bg-transparent disabled:cursor-not-allowed',
                            )}
                            aria-label={`${fullName(u)}, ${fmt(date, 'EEEE d MMMM')}: ${here.map(s => shiftMeta(s.shiftType).label).join(', ') || 'nessun turno'}`}
                          >
                            {here.map(s => {
                              const meta = shiftMeta(s.shiftType);
                              return (
                                <span key={s.id} className={cn('rounded-lg px-2 py-1 text-xs font-semibold flex items-center gap-1', meta.solid)}>
                                  <meta.icon size={12} /> {meta.label}
                                </span>
                              );
                            })}
                            {elsewhere.map(s => (
                              <span key={s.id} className="rounded-lg px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-500 truncate" title="Turno in un'altra sede">
                                {shiftMeta(s.shiftType).short} · {shops.find(x => x.id === s.shopId)?.name ?? 'Altra sede'}
                              </span>
                            ))}
                            {here.length === 0 && !closed && (
                              <span className="flex-1 flex items-center justify-center text-slate-300 group-hover:text-slate-400">
                                <Plus size={16} />
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">Copertura</td>
                  {isoDays.map(date => {
                    const list = shopShifts.filter(s => s.date === date);
                    const closed = isShopClosed(shop, date);
                    const morning = list.filter(s => s.shiftType !== 'afternoon').length;
                    const afternoon = list.filter(s => s.shiftType !== 'morning').length;
                    return (
                      <td key={date} className="bg-slate-50 border-l border-slate-100 px-2 py-3 text-center">
                        {closed ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : list.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle size={13} /> Scoperto
                          </span>
                        ) : (
                          <span className="inline-flex gap-1.5 text-xs font-semibold">
                            <span className={cn('rounded-md px-1.5 py-0.5', morning ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700')} title="Persone al mattino">
                              M {morning}
                            </span>
                            <span className={cn('rounded-md px-1.5 py-0.5', afternoon ? 'bg-violet-100 text-violet-800' : 'bg-rose-100 text-rose-700')} title="Persone al pomeriggio">
                              P {afternoon}
                            </span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[13px] text-slate-500">
        {SHIFT_TYPE_LIST.map(m => (
          <span key={m.type} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', m.dot)} /> {m.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-slate-300" /> Turno in altra sede
        </span>
      </div>

      {/* Editor casella */}
      <Modal
        open={!!cell}
        onClose={() => setCell(null)}
        size="sm"
        title={cell ? fullName(cell.user) : ''}
        description={cell ? `${capitalize(fmt(cell.date, 'EEEE d MMMM yyyy'))} · ${shop?.name}` : ''}
      >
        {cell && (
          <CellEditor
            shifts={cellShifts}
            shopId={shopId}
            closed={isShopClosed(shop, cell.date)}
            otherShopName={id => shops.find(s => s.id === id)?.name ?? 'Altra sede'}
            onAdd={t => addShift(cell.user.id, cell.date, t)}
            onRemove={removeShift}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        onConfirm={copyPreviousWeek}
        tone="primary"
        title="Copiare la settimana precedente?"
        message={
          <>
            I turni di <strong className="text-slate-700">{shop?.name}</strong> della settimana precedente verranno copiati su{' '}
            {weekLabel(days)}. I turni già presenti non verranno toccati; quelli in conflitto o nei giorni di chiusura saranno saltati.
          </>
        }
        confirmLabel="Copia turni"
      />
    </div>
  );
}

function CellEditor({
  shifts,
  shopId,
  closed,
  otherShopName,
  onAdd,
  onRemove,
}: {
  shifts: Shift[];
  shopId: string;
  closed: boolean;
  otherShopName: (id: string) => string;
  onAdd: (t: ShiftType) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const here = shifts.filter(s => s.shopId === shopId);
  const elsewhere = shifts.filter(s => s.shopId !== shopId);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {closed && (
        <p className="flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          <CalendarDays size={17} /> Il negozio è chiuso in questa data.
        </p>
      )}
      {elsewhere.length > 0 && (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Già in servizio in un'altra sede:
          <ul className="mt-1 font-semibold text-slate-800">
            {elsewhere.map(s => (
              <li key={s.id}>
                {shiftMeta(s.shiftType).label} · {otherShopName(s.shopId)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-2">
        {SHIFT_TYPE_LIST.map(meta => {
          const existing = here.find(s => s.shiftType === meta.type);
          const conflict = existing ? null : shiftConflict(shifts, meta.type);
          const disabled = !!busy || (!existing && (closed || !!conflict));
          return (
            <button
              key={meta.type}
              disabled={disabled}
              onClick={() => run(meta.type, () => (existing ? onRemove(existing.id) : onAdd(meta.type)))}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 h-14 text-left transition-all disabled:opacity-45 disabled:cursor-not-allowed',
                existing ? cn(meta.soft, 'border-2') : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <span className={cn('size-9 rounded-xl flex items-center justify-center', existing ? meta.solid : 'bg-slate-100 text-slate-500')}>
                {busy === meta.type ? <Loader2 size={18} className="animate-spin" /> : <meta.icon size={18} />}
              </span>
              <span className="flex-1">
                <span className="block font-semibold text-slate-800">{meta.label}</span>
                {!existing && conflict && <span className="block text-xs text-slate-500">{conflict}</span>}
              </span>
              {existing ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                  <Trash2 size={14} /> Rimuovi
                </span>
              ) : (
                !disabled && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
                    <Plus size={14} /> Assegna
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
