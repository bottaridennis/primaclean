import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const [nome, ...cognomeParts] = (user.displayName || 'Utente').split(' ');
        await setDoc(userRef, {
          nome: nome || 'Nuovo',
          cognome: cognomeParts.join(' ') || 'Utente',
          email: user.email,
          role: 'employee',
          shopIds: [],
          isApproved: false,
          canSeeColleagues: false
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      if (!formData.nome || !formData.cognome || !formData.email || !formData.password) {
        setError('Tutti i campi sono obbligatori');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Le password non coincidono');
        return;
      }

      try {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        await updateProfile(result.user, { displayName: `${formData.nome} ${formData.cognome}` });
        
        await setDoc(doc(db, 'users', result.user.uid), {
          nome: formData.nome,
          cognome: formData.cognome,
          email: formData.email,
          role: 'employee',
          shopIds: [],
          isApproved: false,
          canSeeColleagues: false
        });
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      try {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      } catch (err: any) {
        setError('Email o password errati');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-md w-full border border-slate-100"
      >
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg transform -rotate-3 text-white">
          <LogIn size={32} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-1">Prima Clean</h1>
        <p className="text-slate-400 mb-8 font-bold text-xs uppercase tracking-widest">Gestione Turni Aziendali</p>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
          <button 
            onClick={() => { setIsRegistering(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${!isRegistering ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
          >
            ACCEDI
          </button>
          <button 
            onClick={() => { setIsRegistering(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${isRegistering ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
          >
            REGISTRATI
          </button>
        </div>

        {error && <p className="text-red-500 text-[10px] font-bold uppercase mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {isRegistering && (
              <motion.div
                key="register-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Cognome"
                      value={formData.cognome}
                      onChange={(e) => setFormData({...formData, cognome: e.target.value})}
                      className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <AnimatePresence>
            {isRegistering && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative overflow-hidden"
              >
                <input
                  type="password"
                  placeholder="Conferma Password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all mt-4"
                />
                <Lock size={14} className="absolute left-4 top-[2.3rem] -translate-y-1/2 text-slate-400" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-md active:scale-[0.98] mt-4 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
          >
            {isRegistering ? <><UserPlus size={16} /> Registrati</> : <><LogIn size={16} /> Accedi</>}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 px-2 bg-white">Oppure</div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-tight hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Accedi con Google
        </button>

        <p className="mt-8 text-[10px] text-slate-400 font-medium leading-relaxed">
          Registrandoti sarai inserito in lista di attesa.<br/>Un amministratore dovrà approvare il tuo profilo.
        </p>
      </motion.div>
    </div>
  );
}
