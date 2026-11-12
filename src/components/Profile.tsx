import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { endOfMonth, startOfMonth } from 'date-fns';
import { Eye, EyeOff, KeyRound, Loader2, LogOut, Mail, ShieldCheck, Store } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useLiveQuery, useShops } from '../lib/hooks';
import { SHIFT_TYPE_LIST } from '../lib/shifts';
import { capitalize, cn, fmt, fullName, toISODate } from '../lib/utils';
import type { Shift, User } from '../types';
import { Avatar } from './ui/Avatar';
import { PageHeader } from './ui/Primitives';
import { useToast } from './ui/Toast';

/** Turni del mese corrente per un negozio (rispettando i permessi del dipendente) */
function useMyShopShifts(user: User, shopId: string) {
  return useLiveQuery<Shift>(
    () => query(collection(db, 'shifts'), where('shopId', '==', shopId), where('userId', '==', user.id)),
    `profile-${shopId}-${user.id}`,
  );
}

function ShopShiftCounter({ user, shopId, onData }: { user: User; shopId: string; onData: (id: string, s: Shift[]) => void }) {
  const { data } = useMyShopShifts(user, shopId);
  useEffect(() => onData(shopId, data), [data, shopId, onData]);
  return null;
}

export default function Profile({ user }: { user: User }) {
  const toast = useToast();
  const { data: shops } = useShops();
  const [byShop, setByShop] = useState<Record<string, Shift[]>>({});
  const [sending, setSending] = useState(false);
  const isAdmin = user.role === 'admin';
  const myShops = shops.filter(s => (user.shopIds ?? []).includes(s.id));
  const usesPassword = auth.currentUser?.providerData.some(p => p.providerId === 'password');

  const onData = useMemo(
    () => (id: string, list: Shift[]) => setByShop(prev => (prev[id] === list ? prev : { ...prev, [id]: list })),
    [],
  );

  const monthStart = toISODate(startOfMonth(new Date()));
  const monthEnd = toISODate(endOfMonth(new Date()));
  const monthShifts = myShops.flatMap(s => byShop[s.id] ?? []).filter(s => s.date >= monthStart && s.date <= monthEnd);

  const resetPassword = async () => {
    if (!user.email) return;
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success(`Ti abbiamo inviato un'email a ${user.email} per cambiare la password.`);
    } catch (err) {
      toast.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Il mio profilo" />
      {myShops.map(s => (
        <ShopShiftCounter key={s.id} user={user} shopId={s.id} onData={onData} />
      ))}

      <section className="card p-6 flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar user={user} size="xl" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold text-brand-950">{fullName(user)}</h2>
          <p className="text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
            <Mail size={15} /> {user.email}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {isAdmin ? (
              <span className="chip bg-brand-100 text-brand-800"><ShieldCheck size={13} /> Amministratore</span>
            ) : (
              <span className="chip bg-slate-100 text-slate-700">Dipendente</span>
            )}
            {!isAdmin && (
              <span className="chip bg-slate-100 text-slate-700">
                {user.canSeeColleagues ? <Eye size={13} /> : <EyeOff size={13} />}
                {user.canSeeColleagues ? 'Vedi i turni dei colleghi' : 'Vedi solo i tuoi turni'}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <section className="card p-5">
          <h3 className="font-bold text-slate-900 mb-3">I miei negozi</h3>
          {myShops.length === 0 ? (
            <p className="text-sm text-slate-500">{isAdmin ? 'Come amministratore hai accesso a tutti i negozi.' : 'Nessun negozio assegnato.'}</p>
          ) : (
            <ul className="space-y-2">
              {myShops.map(s => (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                  <span className="size-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                    <Store size={16} />
                  </span>
                  <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h3 className="font-bold text-slate-900">{capitalize(fmt(new Date(), 'MMMM yyyy'))}</h3>
          <p className="text-sm text-slate-500 mb-4">Riepilogo dei tuoi turni nel mese</p>
          <p className="text-4xl font-extrabold text-brand-950">{monthShifts.length}</p>
          <p className="text-sm text-slate-500 mb-4">turni totali</p>
          <div className="space-y-2">
            {SHIFT_TYPE_LIST.map(m => {
              const n = monthShifts.filter(s => s.shiftType === m.type).length;
              const pct = monthShifts.length ? (n / monthShifts.length) * 100 : 0;
              return (
                <div key={m.type} className="flex items-center gap-3 text-sm">
                  <span className="w-28 text-slate-600 flex items-center gap-1.5">
                    <m.icon size={14} /> {m.label}
                  </span>
                  <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <span className={cn('block h-full rounded-full', m.dot)} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-6 text-right font-semibold text-slate-700">{n}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card p-5 mt-4 space-y-3">
        <h3 className="font-bold text-slate-900">Sicurezza</h3>
        {usesPassword ? (
          <button className="btn btn-secondary w-full sm:w-auto" onClick={resetPassword} disabled={sending}>
            {sending ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />} Cambia password via email
          </button>
        ) : (
          <p className="text-sm text-slate-500">Accedi con il tuo account Google: la password si gestisce dalle impostazioni Google.</p>
        )}
        <div className="pt-3 border-t border-slate-100">
          <button className="btn btn-ghost text-rose-600 hover:bg-rose-50 -ml-2" onClick={() => auth.signOut()}>
            <LogOut size={18} /> Esci dall'account
          </button>
        </div>
      </section>
    </div>
  );
}
