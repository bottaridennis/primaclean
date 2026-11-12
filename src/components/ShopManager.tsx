import { useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { CalendarOff, Check, ChevronDown, Flag, Loader2, Pencil, Plus, Store, Trash2, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { db } from '../lib/firebase';
import { useApprovedUsers, useShops } from '../lib/hooks';
import { capitalize, cn, fmt, italianHolidays, todayISO } from '../lib/utils';
import type { Shop } from '../types';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState, PageHeader, Spinner } from './ui/Primitives';
import { useToast } from './ui/Toast';

export default function ShopManager() {
  const toast = useToast();
  const { data: shops, loading } = useShops();
  const { data: staff } = useApprovedUsers();
  const [newShopName, setNewShopName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Shop | null>(null);

  const staffCount = useMemo(() => {
    const counts: Record<string, number> = {};
    staff.forEach(u => (u.shopIds ?? []).forEach(id => (counts[id] = (counts[id] ?? 0) + 1)));
    return counts;
  }, [staff]);

  const createShop = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newShopName.trim();
    if (!name) return;
    if (shops.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Esiste già un negozio con questo nome.');
      return;
    }
    setCreating(true);
    try {
      await addDoc(collection(db, 'shops'), { name, closedHolidays: [] });
      setNewShopName('');
      toast.success(`Negozio «${name}» creato.`);
    } catch (err) {
      toast.error(err);
    } finally {
      setCreating(false);
    }
  };

  const deleteShop = async () => {
    if (!toDelete) return;
    try {
      // Rimuove i turni del negozio e lo scollega dal personale
      const shiftsSnap = await getDocs(query(collection(db, 'shifts'), where('shopId', '==', toDelete.id)));
      const ops: ((b: ReturnType<typeof writeBatch>) => void)[] = [];
      shiftsSnap.docs.forEach(d => ops.push(b => b.delete(d.ref)));
      staff
        .filter(u => (u.shopIds ?? []).includes(toDelete.id))
        .forEach(u => ops.push(b => b.update(doc(db, 'users', u.id), { shopIds: u.shopIds.filter(id => id !== toDelete.id) })));
      for (let i = 0; i < ops.length; i += 450) {
        const batch = writeBatch(db);
        ops.slice(i, i + 450).forEach(op => op(batch));
        await batch.commit();
      }
      await deleteDoc(doc(db, 'shops', toDelete.id));
      toast.success(`Negozio «${toDelete.name}» eliminato.`);
    } catch (err) {
      toast.error(err);
    }
  };

  if (loading) return <Spinner label="Caricamento negozi…" />;

  return (
    <div>
      <PageHeader
        title="Negozi e chiusure"
        description="Gestisci i punti vendita e i giorni di chiusura: nei giorni chiusi non si possono assegnare turni."
      />

      <form onSubmit={createShop} className="card p-4 sm:p-5 flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-11"
            value={newShopName}
            onChange={e => setNewShopName(e.target.value)}
            placeholder="Nome del nuovo negozio, es. «Prima Clean – Centro»"
            aria-label="Nome nuovo negozio"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={!newShopName.trim() || creating}>
          {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Aggiungi negozio
        </button>
      </form>

      {shops.length === 0 ? (
        <div className="card">
          <EmptyState icon={Store} title="Ancora nessun negozio" description="Aggiungi il primo punto vendita con il campo qui sopra." />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shops.map(shop => (
            <ShopCard key={shop.id} shop={shop} staffCount={staffCount[shop.id] ?? 0} onDelete={() => setToDelete(shop)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={deleteShop}
        title={`Eliminare «${toDelete?.name}»?`}
        message="Verranno eliminati anche tutti i turni del negozio e il personale non risulterà più assegnato a questa sede. L'operazione non è reversibile."
        confirmLabel="Elimina negozio"
      />
    </div>
  );
}

function ShopCard({ shop, staffCount, onDelete }: { shop: Shop; staffCount: number; onDelete: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shop.name);
  const [date, setDate] = useState('');
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();

  const holidays = [...(shop.closedHolidays ?? [])].sort();
  const upcoming = holidays.filter(d => d >= today);
  const past = holidays.filter(d => d < today);
  const holidayNames = useMemo(() => {
    const years = new Set(holidays.map(d => Number(d.slice(0, 4))));
    const map: Record<string, string> = {};
    years.forEach(y => italianHolidays(y).forEach(h => (map[h.date] = h.name)));
    return map;
  }, [holidays.join()]);

  const saveHolidays = async (list: string[], msg?: string) => {
    try {
      await updateDoc(doc(db, 'shops', shop.id), { closedHolidays: Array.from(new Set(list)).sort() });
      if (msg) toast.success(msg);
    } catch (err) {
      toast.error(err);
    }
  };

  const rename = async () => {
    const n = name.trim();
    setEditing(false);
    if (!n || n === shop.name) {
      setName(shop.name);
      return;
    }
    try {
      await updateDoc(doc(db, 'shops', shop.id), { name: n });
      toast.success('Nome aggiornato.');
    } catch (err) {
      setName(shop.name);
      toast.error(err);
    }
  };

  const addDate = async () => {
    if (!date) return;
    if (holidays.includes(date)) {
      toast.info('Questa data è già tra le chiusure.');
      return;
    }
    await saveHolidays([...holidays, date]);
    setDate('');
  };

  const addNational = () => {
    const year = new Date().getFullYear();
    const toAdd = [...italianHolidays(year), ...italianHolidays(year + 1)].map(h => h.date).filter(d => d >= today);
    const missing = toAdd.filter(d => !holidays.includes(d));
    if (missing.length === 0) {
      toast.info('Le festività nazionali sono già presenti.');
      return;
    }
    saveHolidays([...holidays, ...missing], `Aggiunte ${missing.length} festività nazionali.`);
  };

  return (
    <motion.article layout className="card flex flex-col">
      <header className="flex items-center gap-3 p-5 border-b border-slate-100">
        <span className="size-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <Store size={20} />
        </span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2">
              <input
                autoFocus
                className="input h-10"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') rename();
                  if (e.key === 'Escape') {
                    setName(shop.name);
                    setEditing(false);
                  }
                }}
                aria-label="Nome negozio"
              />
              <button className="btn btn-primary btn-sm h-10" onClick={rename} aria-label="Salva nome">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-slate-900 truncate">{shop.name}</h3>
              <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                <Users size={13} /> {staffCount} {staffCount === 1 ? 'dipendente' : 'dipendenti'}
              </p>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex">
            <button className="btn-icon" onClick={() => setEditing(true)} aria-label="Rinomina negozio" title="Rinomina">
              <Pencil size={17} />
            </button>
            <button className="btn-icon hover:text-rose-600 hover:bg-rose-50" onClick={onDelete} aria-label="Elimina negozio" title="Elimina">
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </header>

      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <CalendarOff size={16} className="text-rose-500" /> Giorni di chiusura
          </p>
          <button className="btn btn-ghost btn-sm text-brand-700" onClick={addNational}>
            <Flag size={15} /> Festività nazionali
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            className="input h-11 flex-1"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDate()}
            aria-label={`Aggiungi chiusura per ${shop.name}`}
          />
          <button className="btn btn-secondary" onClick={addDate} disabled={!date}>
            <Plus size={18} /> Aggiungi
          </button>
        </div>

        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">Nessuna chiusura programmata.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            <AnimatePresence initial={false}>
              {upcoming.map(d => (
                <HolidayChip key={d} date={d} name={holidayNames[d]} onRemove={() => saveHolidays(holidays.filter(x => x !== d))} />
              ))}
            </AnimatePresence>
          </ul>
        )}

        {past.length > 0 && (
          <div>
            <button className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1" onClick={() => setShowPast(s => !s)}>
              <ChevronDown size={15} className={cn('transition-transform', showPast && 'rotate-180')} />
              {showPast ? 'Nascondi' : 'Mostra'} {past.length} chiusure passate
            </button>
            {showPast && (
              <ul className="flex flex-wrap gap-2 mt-2 opacity-60">
                {past.map(d => (
                  <HolidayChip key={d} date={d} name={holidayNames[d]} onRemove={() => saveHolidays(holidays.filter(x => x !== d))} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </motion.article>
  );
}

function HolidayChip({ date, name, onRemove }: { date: string; name?: string; onRemove: () => void }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 pl-3 pr-1 py-1 text-[13px] font-semibold text-rose-700"
      title={name}
    >
      {capitalize(fmt(date, 'EEE d MMM yyyy'))}
      {name && <span className="font-medium text-rose-500 hidden sm:inline">· {name}</span>}
      <button onClick={onRemove} className="size-6 rounded-lg flex items-center justify-center hover:bg-rose-100" aria-label={`Rimuovi chiusura del ${date}`}>
        <X size={14} />
      </button>
    </motion.li>
  );
}
