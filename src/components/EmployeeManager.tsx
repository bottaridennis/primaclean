import { useMemo, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Ban, CheckCircle2, Eye, EyeOff, Pencil, Search, ShieldCheck, ShieldOff, Store, Trash2, UserPlus, Users, X } from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { useApprovedUsers, usePendingUsers, useShops } from '../lib/hooks';
import { cn, fullName, todayISO } from '../lib/utils';
import type { User } from '../types';
import { Avatar } from './ui/Avatar';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { EmptyState, PageHeader, PillTabs, Spinner } from './ui/Primitives';
import { useToast } from './ui/Toast';
import UserFormModal from './UserFormModal';

type Filter = 'all' | 'employee' | 'admin' | 'blocked' | 'pending';

export default function EmployeeManager({ currentUser }: { currentUser: User }) {
  const toast = useToast();
  const { data: users, loading } = useApprovedUsers();
  const { data: pending } = usePendingUsers();
  const { data: shops } = useShops();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [shopFilter, setShopFilter] = useState('');
  const [editing, setEditing] = useState<{ user: User; mode: 'edit' | 'approve' } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'promote' | 'demote' | 'block' | 'delete'; user: User } | null>(null);

  const shopName = (id: string) => shops.find(s => s.id === id)?.name;

  const list = useMemo(() => {
    const base = filter === 'pending' ? pending : users;
    const q = search.trim().toLowerCase();
    return base.filter(u => {
      if (filter === 'employee' && u.role !== 'employee') return false;
      if (filter === 'admin' && u.role !== 'admin') return false;
      if (filter === 'blocked' && !u.isBlocked) return false;
      if (shopFilter && !(u.shopIds ?? []).includes(shopFilter)) return false;
      if (q && !`${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, pending, filter, search, shopFilter]);

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    try {
      if (kind === 'promote') {
        await updateDoc(doc(db, 'users', user.id), { role: 'admin' });
        toast.success(`${user.nome} ora è amministratore.`);
      } else if (kind === 'demote') {
        await updateDoc(doc(db, 'users', user.id), { role: 'employee' });
        toast.success(`${user.nome} ora è un dipendente.`);
      } else if (kind === 'block') {
        await updateDoc(doc(db, 'users', user.id), { isBlocked: !user.isBlocked });
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
        toast.success(`Profilo di ${user.nome} eliminato${future.length ? ` insieme a ${future.length} turni futuri` : ''}.`);
      }
    } catch (err) {
      toast.error(err);
    }
  };

  if (loading) return <Spinner label="Caricamento personale…" />;

  const counts = {
    all: users.length,
    employee: users.filter(u => u.role === 'employee').length,
    admin: users.filter(u => u.role === 'admin').length,
    blocked: users.filter(u => u.isBlocked).length,
    pending: pending.length,
  };

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
      <PageHeader title="Personale" description="Gestisci accessi, ruoli e negozi assegnati a ogni collaboratore." />

      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-11 pr-10"
              placeholder="Cerca per nome o email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Cerca personale"
            />
            {search && (
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon size-9" onClick={() => setSearch('')} aria-label="Cancella ricerca">
                <X size={16} />
              </button>
            )}
          </div>
          <select className="input sm:w-60" value={shopFilter} onChange={e => setShopFilter(e.target.value)} aria-label="Filtra per negozio">
            <option value="">Tutti i negozi</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <PillTabs<Filter>
          value={filter}
          onChange={setFilter}
          ariaLabel="Filtra personale"
          options={[
            { value: 'all', label: 'Tutti', badge: <Count n={counts.all} /> },
            { value: 'pending', label: 'In attesa', badge: counts.pending ? <Count n={counts.pending} warn /> : undefined },
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(u => {
            const isMe = u.id === currentUser.id;
            const isPending = !u.isApproved;
            return (
              <motion.article
                key={u.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('card p-4 flex flex-col gap-4', u.isBlocked && 'bg-slate-50')}
              >
                <div className="flex items-start gap-3">
                  <Avatar user={u} size="lg" className={u.isBlocked ? 'grayscale opacity-60' : ''} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">
                      {fullName(u)} {isMe && <span className="text-sm font-medium text-slate-400">(tu)</span>}
                    </p>
                    <p className="text-[13px] text-slate-500 truncate">{u.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {isPending ? (
                        <span className="chip bg-amber-100 text-amber-800">In attesa</span>
                      ) : u.role === 'admin' ? (
                        <span className="chip bg-brand-100 text-brand-800"><ShieldCheck size={13} /> Amministratore</span>
                      ) : (
                        <span className="chip bg-slate-100 text-slate-600">Dipendente</span>
                      )}
                      {u.isBlocked && <span className="chip bg-rose-100 text-rose-700"><Ban size={13} /> Sospeso</span>}
                      {!isPending && u.role !== 'admin' && (
                        <span className="chip bg-slate-100 text-slate-600" title="Visibilità turni colleghi">
                          {u.canSeeColleagues ? <Eye size={13} /> : <EyeOff size={13} />}
                          {u.canSeeColleagues ? 'Vede colleghi' : 'Solo propri turni'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(u.shopIds ?? []).filter(shopName).length > 0 ? (
                    (u.shopIds ?? []).filter(shopName).map(id => (
                      <span key={id} className="chip bg-white border border-slate-200 text-slate-700">
                        <Store size={12} className="text-brand-500" /> {shopName(id)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[13px] text-slate-400">Nessun negozio assegnato</span>
                  )}
                </div>

                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-1">
                  {isPending ? (
                    <>
                      <button className="btn btn-primary btn-sm flex-1" onClick={() => setEditing({ user: u, mode: 'approve' })}>
                        Approva
                      </button>
                      <button className="btn-icon hover:text-rose-600 hover:bg-rose-50" onClick={() => setConfirm({ kind: 'delete', user: u })} aria-label="Rifiuta">
                        <Trash2 size={17} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing({ user: u, mode: 'edit' })}>
                        <Pencil size={15} /> Modifica
                      </button>
                      <div className="flex-1" />
                      {!isMe && (
                        <>
                          {u.role === 'employee' ? (
                            <button className="btn-icon" title="Promuovi ad amministratore" aria-label="Promuovi ad amministratore" onClick={() => setConfirm({ kind: 'promote', user: u })}>
                              <ShieldCheck size={18} />
                            </button>
                          ) : (
                            <button className="btn-icon" title="Revoca permessi admin" aria-label="Revoca permessi admin" onClick={() => setConfirm({ kind: 'demote', user: u })}>
                              <ShieldOff size={18} />
                            </button>
                          )}
                          <button
                            className={cn('btn-icon', u.isBlocked ? 'text-emerald-600 hover:bg-emerald-50' : 'hover:text-amber-700 hover:bg-amber-50')}
                            title={u.isBlocked ? 'Riattiva accesso' : 'Sospendi accesso'}
                            aria-label={u.isBlocked ? 'Riattiva accesso' : 'Sospendi accesso'}
                            onClick={() => setConfirm({ kind: 'block', user: u })}
                          >
                            {u.isBlocked ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                          </button>
                          <button
                            className="btn-icon hover:text-rose-600 hover:bg-rose-50"
                            title="Elimina profilo"
                            aria-label="Elimina profilo"
                            onClick={() => setConfirm({ kind: 'delete', user: u })}
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <UserFormModal user={editing?.user ?? null} mode={editing?.mode ?? 'edit'} shops={shops} onClose={() => setEditing(null)} />
      {confirm && confirmCopy && (
        <ConfirmDialog
          open
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.label}
          tone={confirmCopy.tone}
        />
      )}
    </div>
  );
}

function Count({ n, warn }: { n: number; warn?: boolean }) {
  return (
    <span className={cn('min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center', warn ? 'bg-amber-400 text-amber-950' : 'bg-slate-400/25')}>
      {n}
    </span>
  );
}
