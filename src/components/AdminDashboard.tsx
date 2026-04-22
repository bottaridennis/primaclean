import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { User, Shop } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Shield, Store as ShopIcon, User as UserIcon } from 'lucide-react';

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [canSeeColleagues, setCanSeeColleagues] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('isApproved', '==', false));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setPendingUsers(users);
      setIsLoading(false);
    });

    const unsubscribeShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
      const shopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopsData);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeShops();
    };
  }, []);

  const handleApprove = async () => {
    if (!selectedUser || selectedShopIds.length === 0) return;

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        isApproved: true,
        shopIds: selectedShopIds,
        canSeeColleagues: canSeeColleagues
      });
      setSelectedUser(null);
      setSelectedShopIds([]);
      setCanSeeColleagues(false);
    } catch (error) {
      console.error("Error approving user:", error);
    }
  };

  const toggleShop = (shopId: string) => {
    setSelectedShopIds(prev => 
      prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]
    );
  };

  if (isLoading) return <div className="flex justify-center p-8">Caricamento utenti in attesa...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-bold text-slate-800">Approvazioni Pendenti</h2>
        </div>
        <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-tight">
          {pendingUsers.length} Nuovi
        </span>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-medium shadow-sm">
          Nessun utente in attesa di approvazione.
        </div>
      ) : (
        <div className="grid gap-3">
          {pendingUsers.map((user) => (
            <motion.div
              key={user.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                  {user.nome[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">{user.nome} {user.cognome}</h3>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(user)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                id={`approve-btn-${user.id}`}
              >
                Approva
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Approvazione Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-slate-200"
            >
              <div className="mb-6">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Configurazione Utente</p>
                <h3 className="text-2xl font-bold text-slate-900">Approva {selectedUser.nome}</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Assegna Negozi (Uno o più)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {shops.map(shop => (
                      <div 
                        key={shop.id}
                        onClick={() => toggleShop(shop.id)}
                        className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-2 ${
                          selectedShopIds.includes(shop.id) 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                        }`}
                      >
                         <div className={`w-3 h-3 rounded-md border flex items-center justify-center transition-colors ${
                           selectedShopIds.includes(shop.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                         }`}>
                           {selectedShopIds.includes(shop.id) && <Check size={8} strokeWidth={4} />}
                         </div>
                         {shop.name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    id="canSeeColleagues"
                    checked={canSeeColleagues}
                    onChange={(e) => setCanSeeColleagues(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="canSeeColleagues" className="text-xs text-slate-600 font-bold uppercase tracking-tight cursor-pointer">
                    Visibilità turni colleghi
                  </label>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleApprove}
                  disabled={selectedShopIds.length === 0}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale transition-all shadow-md"
                >
                  Confirm Approvazione
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
