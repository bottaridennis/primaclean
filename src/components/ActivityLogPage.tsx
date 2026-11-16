import { useMemo, useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { ArrowLeftRight, CalendarRange, History, Search, Store, Users, type LucideIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery, useShops } from '../lib/hooks';
import { HELP } from '../lib/help';
import { capitalize, cn, fmt } from '../lib/utils';
import type { ActivityLog } from '../types';
import { EmptyState, PageHeader, PillTabs, Spinner } from './ui/Primitives';

const PAGE = 100;
type Kind = 'all' | ActivityLog['kind'];

const KINDS: Record<ActivityLog['kind'], { label: string; icon: LucideIcon; tone: string }> = {
  shift: { label: 'Turni', icon: CalendarRange, tone: 'bg-brand-100 text-brand-700' },
  shop: { label: 'Negozi', icon: Store, tone: 'bg-rose-100 text-rose-700' },
  user: { label: 'Personale', icon: Users, tone: 'bg-violet-100 text-violet-700' },
  exchange: { label: 'Scambi', icon: ArrowLeftRight, tone: 'bg-amber-100 text-amber-700' },
};

export default function ActivityLogPage() {
  const [max, setMax] = useState(PAGE);
  const [kind, setKind] = useState<Kind>('all');
  const [search, setSearch] = useState('');
  const { data: shops } = useShops();
  const { data: logs, loading } = useLiveQuery<ActivityLog>(
    () => query(collection(db, 'activityLogs'), orderBy('at', 'desc'), limit(max)),
    `activity-${max}`,
  );
  const shopName = (id?: string) => (id ? shops.find(s => s.id === id)?.name : undefined);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(
      l => (kind === 'all' || l.kind === kind) && (!q || `${l.actorName} ${l.action} ${l.details ?? ''} ${shopName(l.shopId) ?? ''}`.toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, kind, search, shops]);

  // Raggruppa per giorno
  const groups = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    filtered.forEach(l => {
      const day = l.at.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), l]);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div>
      <PageHeader title="Registro attività" description="Chi ha modificato cosa, e quando. Utile per controlli e chiarimenti." help={HELP.activity} />

      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-11" placeholder="Cerca per nome, azione o negozio…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Cerca nel registro" />
        </div>
        <PillTabs<Kind>
          value={kind}
          onChange={setKind}
          ariaLabel="Categoria"
          options={[{ value: 'all', label: 'Tutto' }, ...(Object.keys(KINDS) as ActivityLog['kind'][]).map(k => ({ value: k, label: KINDS[k].label }))]}
        />
      </div>

      {loading && logs.length === 0 ? (
        <Spinner label="Caricamento registro…" />
      ) : groups.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={History}
            title={logs.length ? 'Nessun risultato' : 'Il registro è vuoto'}
            description={logs.length ? 'Prova a cambiare categoria o ricerca.' : 'Da ora in poi ogni modifica a turni, negozi e personale verrà annotata qui.'}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, list]) => (
            <section key={day}>
              <p className="eyebrow mb-2">{capitalize(fmt(day, 'EEEE d MMMM yyyy'))}</p>
              <ul className="card divide-y divide-slate-100">
                {list.map(l => {
                  const k = KINDS[l.kind] ?? KINDS.shift;
                  return (
                    <li key={l.id} className="flex gap-3 p-4">
                      <span className={cn('size-9 rounded-xl flex items-center justify-center shrink-0', k.tone)}>
                        <k.icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-800">
                          <strong>{l.actorName}</strong> · {l.action}
                        </p>
                        {l.details && <p className="text-[13px] text-slate-500 break-words">{l.details}</p>}
                        {shopName(l.shopId) && (
                          <p className="text-[12px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Store size={11} /> {shopName(l.shopId)}
                          </p>
                        )}
                      </div>
                      <time className="text-[13px] text-slate-400 tabular-nums shrink-0" dateTime={l.at}>
                        {fmt(l.at, 'HH:mm')}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {logs.length >= max && (
        <div className="flex justify-center mt-5">
          <button className="btn btn-secondary" onClick={() => setMax(m => m + PAGE)}>
            Carica attività precedenti
          </button>
        </div>
      )}
    </div>
  );
}
