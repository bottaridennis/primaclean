import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, User as UserIcon, ShieldAlert, Check, X, ShieldCheck, AlertTriangle, Edit2, Save } from 'lucide-react';

export default function EmployeeManager() {
  // ...
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      nome: user.nome,
      cognome: user.cognome,
      shopIds: user.shopIds || [],
      canSeeColleagues: user.canSeeColleagues || false
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        nome: editFormData.nome,
        cognome: editFormData.cognome,
        shopIds: editFormData.shopIds,
        canSeeColleagues: editFormData.canSeeColleagues
      });
      setEditingUser(null);
    } catch (err) {
      console.error("Error updating user:", err);
    }
  };

  const toggleShopInEdit = (shopId: string) => {
    setEditFormData(prev => ({
      ...prev,
      shopIds: prev.shopIds.includes(shopId) 
        ? prev.shopIds.filter(id => id !== shopId) 
        : [...prev.shopIds, shopId]
    }));
  };
  const [employees, setEmployees] = useState<User[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Promotion State
  const [promotingUser, setPromotingUser] = useState<User | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [userInputCode, setUserInputCode] = useState('');
  const [error, setError] = useState('');

  // Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    cognome: '',
    shopIds: [] as string[],
    canSeeColleagues: false
  });

  useEffect(() => {
    // ... lines 19-36
    // Only approved users
    const q = query(collection(db, 'users'), where('isApproved', '==', true));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setEmployees(users);
      setIsLoading(false);
    });

    const unsubscribeShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeShops();
    };
  }, []);

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const initiatePromotion = (user: User) => {
    const code = generateCode();
    setVerificationCode(code);
    setPromotingUser(user);
    setUserInputCode('');
    setError('');
  };

  const confirmPromotion = async () => {
    if (userInputCode !== verificationCode) {
      setError('Codice errato. Riprova.');
      return;
    }

    if (!promotingUser) return;

    try {
      await updateDoc(doc(db, 'users', promotingUser.id), {
        role: 'admin'
      });
      setPromotingUser(null);
      setVerificationCode('');
      setUserInputCode('');
    } catch (err) {
      console.error("Error promoting user:", err);
      setError('Errore durante la promozione.');
    }
  };

  const demoteToEmployee = async (user: User) => {
    if (!confirm(`Sei sicuro di voler rimuovere i permessi admin a ${user.nome}?`)) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role: 'employee'
      });
    } catch (err) {
      console.error("Error demoting user:", err);
    }
  };

  if (isLoading) return <div className="flex justify-center p-8">Caricamento dipendenti...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-slate-800">Gestione Permessi Dipendenti</h2>
        </div>
        <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tight">
          {employees.length} Totali
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((user) => (
          <motion.div
            key={user.id}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full bg-white p-5 rounded-[2rem] shadow-sm border ${
              user.role === 'admin' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
            } group transition-all hover:shadow-md`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm border ${
                  user.role === 'admin' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {user.nome[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{user.nome} {user.cognome}</h3>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditClick(user)}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
                  title="Modifica Anagrafica"
                >
                  <Edit2 size={16} />
                </button>
                <div className={`p-2 rounded-xl border ${
                  user.role === 'admin' ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                  {user.role === 'admin' ? <ShieldCheck size={18} /> : <UserIcon size={18} />}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 shadow-sm-white inline-block">Negozi Assegnati</p>
                <div className="flex flex-wrap gap-1">
                  {user.shopIds && user.shopIds.length > 0 ? (
                    user.shopIds.map(sid => {
                      const shop = shops.find(s => s.id === sid);
                      return (
                        <span key={sid} className="bg-white border border-slate-100 text-[10px] px-2 py-0.5 rounded-lg font-bold text-slate-600 shadow-sm">
                          {shop?.name || '...'}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">Nessun negozio</span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-tight ${user.role === 'admin' ? 'text-amber-600' : 'text-slate-500'}`}>
                    Ruolo: {user.role === 'admin' ? 'Amministratore' : 'Dipendente'}
                  </span>
                </div>
                
                {user.role === 'employee' ? (
                  <button
                    onClick={() => initiatePromotion(user)}
                    className="text-[10px] font-bold bg-amber-600 text-white px-3 py-1.5 rounded-xl hover:bg-amber-700 transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Shield size={12} strokeWidth={3} /> Promuovi Admin
                  </button>
                ) : (
                  <button
                    onClick={() => demoteToEmployee(user)}
                    className="text-[10px] font-bold bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl hover:bg-slate-300 transition-all flex items-center gap-1.5"
                  >
                    Rendi Dipendente
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Promotion Security Challenge Modal - ADAPTIVE */}
      <AnimatePresence>
        {promotingUser && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-[3rem] md:rounded-[3rem] p-8 md:p-10 w-full max-w-md shadow-2xl border border-slate-200 text-center fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto"
            >
              {/* Handle for mobile bottom sheet */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 md:hidden" />
              
              <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-100 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-amber-50">
                <ShieldAlert className="text-amber-600 w-8 h-8 md:w-10 md:h-10" />
              </div>
              
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Sicurezza Richiesta</h3>
              <p className="text-slate-500 text-xs md:text-sm mb-6 md:mb-8">
                Stai promuovendo <span className="font-bold text-slate-900">{promotingUser.nome}</span> ad <span className="text-amber-600 font-bold uppercase tracking-widest text-xs">Amministratore</span>.
              </p>

              <div className="bg-slate-50 p-4 md:p-6 rounded-[2rem] border border-slate-100 mb-6 md:mb-8 border-dashed">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 md:mb-3">Codice di Verifica</p>
                <div className="text-3xl md:text-4xl font-black text-indigo-600 tracking-[0.5em] select-none">
                  {verificationCode}
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Esegui codice..."
                    value={userInputCode}
                    onChange={(e) => {
                      setUserInputCode(e.target.value);
                      setError('');
                    }}
                    className={`w-full p-4 md:p-5 bg-slate-50 border ${error ? 'border-red-300' : 'border-slate-100'} rounded-2xl text-center text-lg md:text-xl font-black tracking-[0.3em] outline-none focus:ring-4 focus:ring-indigo-100 transition-all`}
                  />
                  {userInputCode === verificationCode && userInputCode !== '' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                      <Check size={20} strokeWidth={4} />
                    </div>
                  )}
                </div>
                
                {error && (
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center justify-center gap-1">
                    <AlertTriangle size={12} /> {error}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setPromotingUser(null)}
                    className="flex-1 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmPromotion}
                    disabled={userInputCode.length !== 6}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
                  >
                    Conferma
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editing Modal - ADAPTIVE MODAL/SHEET */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-[3rem] md:rounded-[3rem] p-8 pb-12 md:pb-10 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[92vh] md:max-h-[85vh] relative z-[101]"
            >
              <div className="flex flex-col items-center mb-8">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mb-6 md:hidden" />
                <div className="text-center">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Anagrafica</p>
                  <h3 className="text-2xl font-black text-slate-900 italic italic-text-none">Scheda Dipendente</h3>
                </div>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
                    <input
                      type="text"
                      className="h-14 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black italic italic-text-none outline-none focus:ring-4 focus:ring-indigo-50"
                      value={editFormData.nome}
                      placeholder="Nome"
                      onChange={e => setEditFormData({...editFormData, nome: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cognome</label>
                    <input
                      type="text"
                      className="h-14 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black italic italic-text-none outline-none focus:ring-4 focus:ring-indigo-50"
                      value={editFormData.cognome}
                      placeholder="Cognome"
                      onChange={e => setEditFormData({...editFormData, cognome: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block mb-3">Sedi Attive</label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {shops.map(shop => (
                      <div 
                        key={shop.id}
                        onClick={() => toggleShopInEdit(shop.id)}
                        className={`h-12 px-4 rounded-2xl border text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer flex items-center justify-center text-center gap-3 ${
                          editFormData.shopIds.includes(shop.id) 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                            : 'bg-white border-slate-100 text-slate-400'
                        }`}
                      >
                         {shop.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-50/50 px-5 py-5 rounded-[2rem] border border-indigo-100 italic-text-none">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-indigo-900 uppercase tracking-tight italic">Privacy Collaboratore</p>
                      <p className="text-[9px] text-indigo-400 font-bold tracking-widest mt-0.5">PUÒ VEDERE I TURNI DEI COLLEGHI</p>
                    </div>
                    <div 
                      onClick={() => setEditFormData({...editFormData, canSeeColleagues: !editFormData.canSeeColleagues})}
                      className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${editFormData.canSeeColleagues ? 'bg-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-300'}`}
                    >
                      <motion.div 
                        animate={{ x: editFormData.canSeeColleagues ? 24 : 0 }}
                        className="w-6 h-6 bg-white rounded-full shadow-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse md:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 h-14 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Chiudi
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] h-14 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                  >
                    <Save size={16} /> Salva Modifiche
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
