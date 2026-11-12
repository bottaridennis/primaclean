import { useMemo, useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { ArrowLeftRight, Search, Store } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { useLiveQuery, useShops } from '../lib/hooks';
import { shiftMeta } from '../lib/shifts';
import { capitalize, cn, fmt } from '../lib/utils';
import type { ExchangeLog } from '../types';
import { EmptyState, PageHeader, Spinner } from './ui/Primitives';

const PAGE = 50;

export default function ExchangeLogs() {
  const [max, setMax] = useState(PAGE);
  const [search, setSearch] = useState('');
  const [shopId, setShopId] = useState('');
  const { data: shops } = useShops();
  const { data: logs, loading } = useLiveQuery<ExchangeLog & { id: string }>(
    () => query(collection(db, 'exchangeLogs'), orderBy('acceptedAt', 'desc'), limit(max)),
    `logs-${max}`,
  );
  const shopName = (id: string) => shops.find(s => s.id === id)?.name ?? 'Negozio eliminato';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(
      l => (!shopId || l.shopId === shopId) && (!q || `${l.requesterName} ${l.targetUserName}`.toLowerCase().includes(q)),
    );
  }, [logs, search, shopId]);

  return (
    <div>
      <PageHeader title="Storico scambi" description="Tutti gli scambi di turno accettati tra colleghi, dal più recente." />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-11" placeholder="Cerca per nome…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Cerca negli scambi" />
        </div>
        <select className="input sm:w-60" value={shopId} onChange={e => setShopId(e.target.value)} aria-label="Filtra per negozio">
          <option value="">Tutti i negozi</option>
          {shops.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading && logs.length === 0 ? (
        <Spinner label="Caricamento storico…" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ArrowLeftRight}
            title={logs.length ? 'Nessun risultato' : 'Nessuno scambio registrato'}
            description={logs.length ? 'Prova a modificare i filtri.' : 'Quando un dipendente accetta uno scambio, lo troverai qui.'}
          />
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {filtered.map(log => (
            <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              <div className="md:w-40 shrink-0">
                <p className="text-sm font-semibold text-slate-700">{capitalize(fmt(log.acceptedAt, 'd MMM yyyy'))}</p>
                <p className="text-[13px] text-slate-400 flex items-center gap-1">
                  <Store size={12} /> {shopName(log.shopId)} · {fmt(log.acceptedAt, 'HH:mm')}
                </p>
              </div>
              <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <Party name={log.requesterName} date={log.requesterShiftDate} type={log.requesterShiftType} note="ha ceduto" />
                <span className="size-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  <ArrowLeftRight size={16} />
                </span>
                <Party name={log.targetUserName} date={log.targetShiftDate} type={log.targetShiftType} note="ha ceduto" align="right" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {logs.length >= max && (
        <div className="flex justify-center mt-5">
          <button className="btn btn-secondary" onClick={() => setMax(m => m + PAGE)}>
            Carica altri scambi
          </button>
        </div>
      )}
    </div>
  );
}

function Party({ name, date, type, note, align }: { name: string; date: string; type: string; note: string; align?: 'right' }) {
  const meta = shiftMeta(type);
  return (
    <div className={cn('min-w-0', align === 'right' && 'text-right')}>
      <p className="font-bold text-slate-900 truncate">{name}</p>
      <p className="text-[13px] text-slate-500">
        {note}{' '}
        <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-semibold', meta.soft)}>
          {capitalize(fmt(date, 'EEE d MMM'))} · {meta.short}
        </span>
      </p>
    </div>
  );
}
