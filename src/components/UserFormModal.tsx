import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Loader2, Store } from 'lucide-react';
import { db } from '../lib/firebase';
import { cn, fullName } from '../lib/utils';
import type { Shop, User } from '../types';
import { Modal } from './ui/Modal';
import { Switch } from './ui/Primitives';
import { Avatar } from './ui/Avatar';
import { useToast } from './ui/Toast';

interface Props {
  user: User | null;
  shops: Shop[];
  mode: 'approve' | 'edit';
  onClose: () => void;
}

/** Approvazione di un nuovo dipendente o modifica della sua scheda */
export default function UserFormModal({ user, shops, mode, onClose }: Props) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [shopIds, setShopIds] = useState<string[]>([]);
  const [canSeeColleagues, setCanSeeColleagues] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setNome(user.nome ?? '');
    setCognome(user.cognome ?? '');
    setShopIds((user.shopIds ?? []).filter(id => shops.some(s => s.id === id)));
    setCanSeeColleagues(!!user.canSeeColleagues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mode]);

  const toggleShop = (id: string) => setShopIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const isEmployee = user?.role !== 'admin';
  const needsShop = isEmployee && shopIds.length === 0;
  const canSave = !!nome.trim() && !!cognome.trim() && !needsShop && !busy;

  const save = async () => {
    if (!user || !canSave) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        nome: nome.trim(),
        cognome: cognome.trim(),
        shopIds,
        canSeeColleagues,
        ...(mode === 'approve' ? { isApproved: true } : {}),
      });
      toast.success(mode === 'approve' ? `${nome} è stato approvato.` : 'Modifiche salvate.');
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      locked={busy}
      title={mode === 'approve' ? 'Approva nuovo dipendente' : 'Scheda dipendente'}
      description={
        mode === 'approve' ? 'Assegna almeno un negozio: il dipendente vedrà solo i turni delle sedi assegnate.' : undefined
      }
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Annulla
          </button>
          <button className="btn btn-primary" onClick={save} disabled={!canSave}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {mode === 'approve' ? 'Approva e attiva' : 'Salva modifiche'}
          </button>
        </>
      }
    >
      {user && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{fullName(user)}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="uf-nome">Nome</label>
              <input id="uf-nome" className="input" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="uf-cognome">Cognome</label>
              <input id="uf-cognome" className="input" value={cognome} onChange={e => setCognome(e.target.value)} />
            </div>
          </div>

          <fieldset>
            <legend className="field-label">Negozi assegnati</legend>
            {shops.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                Non ci sono ancora negozi. Creane uno dalla sezione «Negozi e chiusure».
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {shops.map(shop => {
                  const on = shopIds.includes(shop.id);
                  return (
                    <button
                      key={shop.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleShop(shop.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border px-3.5 h-12 text-left text-sm font-semibold transition-all',
                        on ? 'border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-500' : 'border-slate-200 text-slate-600 hover:border-slate-300',
                      )}
                    >
                      <span
                        className={cn(
                          'size-5 rounded-md border flex items-center justify-center shrink-0',
                          on ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300',
                        )}
                      >
                        {on && <Check size={13} strokeWidth={3} />}
                      </span>
                      <Store size={16} className={on ? 'text-brand-600' : 'text-slate-400'} />
                      <span className="truncate">{shop.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {needsShop && shops.length > 0 && (
              <p className="mt-2 text-[13px] font-medium text-amber-700">Seleziona almeno un negozio.</p>
            )}
          </fieldset>

          <Switch
            checked={canSeeColleagues}
            onChange={setCanSeeColleagues}
            label="Può vedere i turni dei colleghi"
            description="Necessario anche per proporre scambi di turno."
          />
        </div>
      )}
    </Modal>
  );
}
