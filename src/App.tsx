import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Ban, Hourglass, Loader2, LogOut, UserRound } from 'lucide-react';
import { auth, db } from './lib/firebase';
import type { User } from './types';
import { ToastProvider } from './components/ui/Toast';
import { LogoMark } from './components/ui/Logo';
import Login from './components/Login';
import Layout, { navItemsFor, type TabId } from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import ShopManager from './components/ShopManager';
import ShiftCreator from './components/ShiftCreator';
import EmployeeSchedule from './components/EmployeeSchedule';
import EmployeeManager from './components/EmployeeManager';
import ExchangeLogs from './components/ExchangeLogs';
import Profile from './components/Profile';
import { firebaseErrorMessage } from './lib/utils';

/** Tab corrente sincronizzata con l'hash dell'URL (#/turni ...) */
function useHashTab(): [string, (t: string) => void] {
  const read = () => window.location.hash.replace(/^#\/?/, '');
  const [tab, setTab] = useState(read);
  useEffect(() => {
    const onHash = () => setTab(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = (t: string) => {
    if (t !== read()) window.location.hash = `/${t}`;
    window.scrollTo({ top: 0 });
  };
  return [tab, navigate];
}

type ProfileState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'missing'; firebaseUser: FirebaseUser }
  | { status: 'ready'; user: User };

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

function AppContent() {
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [rawTab, navigate] = useHashTab();

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let missingTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanupUser = () => {
      unsubscribeUser?.();
      unsubscribeUser = null;
      if (missingTimer) clearTimeout(missingTimer);
      missingTimer = null;
    };

    const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
      cleanupUser();
      if (!firebaseUser) {
        setState({ status: 'signed-out' });
        return;
      }
      setState({ status: 'loading' });
      unsubscribeUser = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        snapshot => {
          if (missingTimer) clearTimeout(missingTimer);
          missingTimer = null;
          if (snapshot.exists()) {
            setState({ status: 'ready', user: { id: snapshot.id, shopIds: [], ...snapshot.data() } as User });
          } else {
            // Subito dopo la registrazione il documento può non esistere ancora:
            // attendiamo un attimo prima di chiedere di completare il profilo.
            missingTimer = setTimeout(() => setState({ status: 'missing', firebaseUser }), 2500);
          }
        },
        err => {
          console.error('Errore lettura profilo:', err);
          setState({ status: 'missing', firebaseUser });
        },
      );
    });

    return () => {
      unsubscribeAuth();
      cleanupUser();
    };
  }, []);

  if (state.status === 'loading') return <SplashScreen />;
  if (state.status === 'signed-out') return <Login />;
  if (state.status === 'missing') return <CompleteProfile firebaseUser={state.firebaseUser} />;

  const user = state.user;
  const isAdmin = user.role === 'admin';

  if (user.isBlocked && !isAdmin) {
    return (
      <StatusScreen
        icon={<Ban size={30} />}
        tone="danger"
        title="Accesso sospeso"
        message={
          <>
            Ciao <strong className="text-slate-800">{user.nome}</strong>, il tuo accesso è stato temporaneamente sospeso.
            Per chiarimenti contatta il responsabile del negozio.
          </>
        }
      />
    );
  }

  if (!user.isApproved && !isAdmin) {
    return (
      <StatusScreen
        icon={<Hourglass size={30} />}
        tone="warning"
        title="Profilo in attesa di approvazione"
        message={
          <>
            Grazie <strong className="text-slate-800">{user.nome}</strong>! La tua registrazione è stata ricevuta.
            Un amministratore deve assegnarti al tuo negozio: questa pagina si aggiornerà da sola appena sarai approvato.
          </>
        }
      />
    );
  }

  const allowed = navItemsFor(user).map(i => i.id);
  const fallback: TabId = isAdmin ? 'dashboard' : 'schedule';
  const activeTab = (allowed.includes(rawTab as TabId) ? rawTab : fallback) as TabId;

  return (
    <Layout user={user} activeTab={activeTab} onNavigate={navigate}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'dashboard' && <AdminDashboard user={user} onNavigate={navigate} />}
          {activeTab === 'planner' && <ShiftCreator />}
          {activeTab === 'schedule' && <EmployeeSchedule user={user} />}
          {activeTab === 'staff' && <EmployeeManager currentUser={user} />}
          {activeTab === 'shops' && <ShopManager />}
          {activeTab === 'exchanges' && <ExchangeLogs />}
          {activeTab === 'profile' && <Profile user={user} />}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}

function SplashScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-5 bg-linen">
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
        <LogoMark className="size-16 drop-shadow-lg" />
      </motion.div>
      <p className="text-sm font-medium text-slate-400">Caricamento in corso…</p>
    </div>
  );
}

function StatusScreen({
  icon,
  title,
  message,
  tone,
}: {
  icon: ReactNode;
  title: string;
  message: ReactNode;
  tone: 'danger' | 'warning';
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-linen p-5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card max-w-md w-full p-8 text-center">
        <div
          className={
            'size-16 rounded-3xl mx-auto mb-5 flex items-center justify-center ' +
            (tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600')
          }
        >
          {icon}
        </div>
        <h1 className="text-xl font-extrabold text-brand-950">{title}</h1>
        <p className="mt-2 text-[15px] text-slate-500 leading-relaxed">{message}</p>
        {tone === 'warning' && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            In revisione
          </div>
        )}
        <button onClick={() => auth.signOut()} className="btn btn-secondary w-full mt-8">
          <LogOut size={18} /> Esci
        </button>
      </motion.div>
    </div>
  );
}

/** Mostrato quando l'utente è autenticato ma non ha un profilo nel database */
function CompleteProfile({ firebaseUser }: { firebaseUser: FirebaseUser }) {
  const [first, ...rest] = (firebaseUser.displayName ?? '').split(' ');
  const [nome, setNome] = useState(first ?? '');
  const [cognome, setCognome] = useState(rest.join(' '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) {
      setError('Inserisci nome e cognome.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        nome: nome.trim(),
        cognome: cognome.trim(),
        email: firebaseUser.email,
        role: 'employee',
        shopIds: [],
        isApproved: false,
        isBlocked: false,
        canSeeColleagues: false,
      });
    } catch (err) {
      setError(firebaseErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-linen p-5">
      <form onSubmit={submit} className="card max-w-md w-full p-8">
        <div className="size-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5">
          <UserRound size={26} />
        </div>
        <h1 className="text-xl font-extrabold text-brand-950">Completa il tuo profilo</h1>
        <p className="mt-1 text-[15px] text-slate-500">
          Non abbiamo trovato un profilo collegato a <strong className="text-slate-700">{firebaseUser.email}</strong>.
          Inserisci i tuoi dati per inviare la richiesta di accesso.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div>
            <label className="field-label" htmlFor="cp-nome">Nome</label>
            <input id="cp-nome" className="input" value={nome} onChange={e => setNome(e.target.value)} autoComplete="given-name" />
          </div>
          <div>
            <label className="field-label" htmlFor="cp-cognome">Cognome</label>
            <input id="cp-cognome" className="input" value={cognome} onChange={e => setCognome(e.target.value)} autoComplete="family-name" />
          </div>
        </div>
        {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
        <button type="submit" className="btn btn-primary btn-lg w-full mt-6" disabled={busy}>
          {busy && <Loader2 size={18} className="animate-spin" />} Invia richiesta
        </button>
        <button type="button" onClick={() => auth.signOut()} className="btn btn-ghost w-full mt-2">
          Esci
        </button>
      </form>
    </div>
  );
}
