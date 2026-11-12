import { useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Loader2, Mail, CalendarCheck2, ArrowLeftRight, Sparkles, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { cn, firebaseErrorMessage } from '../lib/utils';
import { Logo } from './ui/Logo';
import { Segmented } from './ui/Primitives';

type Mode = 'login' | 'register' | 'reset';

const newUserDoc = (nome: string, cognome: string, email: string | null) => ({
  nome,
  cognome,
  email,
  role: 'employee',
  shopIds: [],
  isApproved: false,
  isBlocked: false,
  canSeeColleagues: false,
});

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [busy, setBusy] = useState<'form' | 'google' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', password: '', confirmPassword: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setNotice('');
  };

  const handleGoogle = async () => {
    setError('');
    setBusy('google');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const { user } = await signInWithPopup(auth, provider);
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const [nome, ...rest] = (user.displayName || '').split(' ');
        await setDoc(ref, newUserDoc(nome || 'Nuovo', rest.join(' ') || 'Utente', user.email));
      }
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        // Fallback per browser mobile che bloccano i popup; il profilo verrà completato al rientro
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(firebaseErrorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const email = form.email.trim();

    if (mode === 'reset') {
      if (!email) return setError('Inserisci la tua email.');
      setBusy('form');
      try {
        await sendPasswordResetEmail(auth, email);
        setNotice(`Se esiste un account per ${email}, riceverai a breve un'email con il link per reimpostare la password.`);
      } catch (err) {
        setError(firebaseErrorMessage(err));
      } finally {
        setBusy(null);
      }
      return;
    }

    if (mode === 'register') {
      const nome = form.nome.trim();
      const cognome = form.cognome.trim();
      if (!nome || !cognome || !email || !form.password) return setError('Compila tutti i campi.');
      if (form.password.length < 6) return setError('La password deve contenere almeno 6 caratteri.');
      if (form.password !== form.confirmPassword) return setError('Le due password non coincidono.');
      setBusy('form');
      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, form.password);
        await updateProfile(user, { displayName: `${nome} ${cognome}` });
        await setDoc(doc(db, 'users', user.uid), newUserDoc(nome, cognome, email));
      } catch (err) {
        setError(firebaseErrorMessage(err));
        setBusy(null);
      }
      return;
    }

    if (!email || !form.password) return setError('Inserisci email e password.');
    setBusy('form');
    try {
      await signInWithEmailAndPassword(auth, email, form.password);
    } catch (err) {
      setError(firebaseErrorMessage(err));
      setBusy(null);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.05fr_1fr] bg-linen">
      {/* Pannello brand */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-800 bubbles p-12 text-white">
        <div className="absolute -right-24 -bottom-24 size-[420px] rounded-full bg-brand-600/40 blur-2xl" />
        <Logo light />
        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-brand-100">
            <Sparkles size={14} /> Area riservata al personale
          </p>
          <h1 className="mt-5 text-4xl xl:text-5xl font-extrabold leading-[1.08] tracking-tight">
            Turni in ordine,<br />come un capo appena stirato.
          </h1>
          <p className="mt-5 text-lg text-brand-100/90 leading-relaxed">
            Consulta la tua agenda, scambia i turni con i colleghi e resta aggiornato sulle chiusure di ogni punto vendita.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              { icon: CalendarCheck2, text: 'Agenda settimanale sempre aggiornata in tempo reale' },
              { icon: ArrowLeftRight, text: 'Scambio turni con approvazione del collega' },
              { icon: Mail, text: 'Accesso con email o account Google' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="size-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-100/60">© {new Date().getFullYear()} Prima Clean · Lavanderia e lavasecco</p>
      </section>

      {/* Form */}
      <section className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <Logo className="lg:hidden mb-10 justify-center" />

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8">
            {mode === 'reset' ? (
              <button type="button" onClick={() => switchMode('login')} className="btn btn-ghost btn-sm -ml-2 mb-4">
                <ArrowLeft size={16} /> Torna all'accesso
              </button>
            ) : (
              <Segmented
                className="mb-7"
                value={mode}
                onChange={v => switchMode(v)}
                options={[
                  { value: 'login', label: 'Accedi' },
                  { value: 'register', label: 'Registrati' },
                ]}
              />
            )}

            <h2 className="text-2xl font-extrabold tracking-tight text-brand-950">
              {mode === 'login' ? 'Bentornato!' : mode === 'register' ? 'Crea il tuo account' : 'Recupera la password'}
            </h2>
            <p className="mt-1 mb-6 text-[15px] text-slate-500">
              {mode === 'login'
                ? 'Accedi per vedere i tuoi turni.'
                : mode === 'register'
                  ? 'Dopo la registrazione un responsabile approverà il tuo profilo.'
                  : 'Ti invieremo un link per impostarne una nuova.'}
            </p>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="mb-4 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-700"
                >
                  {error}
                </motion.p>
              )}
              {notice && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 flex gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-medium text-emerald-800"
                >
                  <CheckCircle2 size={18} className="shrink-0 mt-px" /> {notice}
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label" htmlFor="nome">Nome</label>
                    <input id="nome" className="input" value={form.nome} onChange={set('nome')} autoComplete="given-name" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="cognome">Cognome</label>
                    <input id="cognome" className="input" value={form.cognome} onChange={set('cognome')} autoComplete="family-name" />
                  </div>
                </div>
              )}

              <div>
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  className="input"
                  placeholder="nome@esempio.it"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="field-label" htmlFor="password">Password</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-[13px] font-semibold text-brand-600 hover:text-brand-800 mb-1.5"
                      >
                        Password dimenticata?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-12"
                      value={form.password}
                      onChange={set('password')}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon size-9"
                      aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {mode === 'register' && <p className="mt-1.5 text-xs text-slate-400">Almeno 6 caratteri.</p>}
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="field-label" htmlFor="confirm">Conferma password</label>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    className={cn(
                      'input',
                      form.confirmPassword && form.confirmPassword !== form.password && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100',
                    )}
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    autoComplete="new-password"
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg w-full !mt-6" disabled={!!busy}>
                {busy === 'form' && <Loader2 size={18} className="animate-spin" />}
                {mode === 'login' ? 'Accedi' : mode === 'register' ? 'Crea account' : 'Invia link di recupero'}
              </button>
            </form>

            {mode !== 'reset' && (
              <>
                <div className="flex items-center gap-3 my-6">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs font-medium text-slate-400">oppure</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <button type="button" onClick={handleGoogle} disabled={!!busy} className="btn btn-secondary btn-lg w-full">
                  {busy === 'google' ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                  Continua con Google
                </button>
              </>
            )}
          </motion.div>

          <p className="mt-6 text-center text-[13px] text-slate-400 leading-relaxed">
            I nuovi account restano in attesa finché un amministratore
            <br className="hidden sm:block" /> non li assegna a un negozio.
          </p>
        </div>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.87-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.79-2.12-6.74-4.96H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.26 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.74l3.99-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.43-3.43A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.63l3.99 3.1C6.21 6.89 8.87 4.77 12 4.77Z" />
    </svg>
  );
}
