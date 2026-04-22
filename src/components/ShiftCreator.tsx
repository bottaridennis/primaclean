import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { User, Shop, Shift } from '../types';
import { Plus, Trash2, Calendar, MapPin, User as UserIcon, Clock, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function ShiftCreator() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedShop, setSelectedShop] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shiftType, setShiftType] = useState<'morning' | 'afternoon' | 'full-day'>('morning');
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Approved users (Employees AND Admins)
    const unsubscribeUsers = onSnapshot(query(collection(db, 'users'), where('isApproved', '==', true)), (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });

    const unsubscribeShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
      const shopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopsData);
      if (shopsData.length > 0 && !selectedShop) setSelectedShop(shopsData[0].id);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeShops();
    };
  }, []);

  useEffect(() => {
    if (!selectedShop || !date) return;
    
    const q = query(
      collection(db, 'shifts'),
      where('shopId', '==', selectedShop),
      where('date', '==', date)
    );
    
    const unsubscribeShifts = onSnapshot(q, (snapshot) => {
      setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift)));
    });
    
    return () => unsubscribeShifts();
  }, [selectedShop, date]);

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedShop || !date) return;

    try {
      await addDoc(collection(db, 'shifts'), {
        userId: selectedUser,
        shopId: selectedShop,
        date,
        shiftType
      });
      setSelectedUser('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteShift = async (id: string) => {
    setShiftToDelete(id);
  };

  const confirmDeleteShift = async () => {
    if (!shiftToDelete) return;
    try {
      await deleteDoc(doc(db, 'shifts', shiftToDelete));
      setShiftToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateShift = async (id: string, newType: 'morning' | 'afternoon' | 'full-day') => {
    try {
      await updateDoc(doc(db, 'shifts', id), {
        shiftType: newType
      });
      setEditingShiftId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
        <h2 className="text-xl font-bold text-slate-800">Pianificazione Turni</h2>
      </div>

      <form onSubmit={handleAddShift} className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Data Turno</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Seleziona Negozio</label>
              <div className="relative">
                <select
                  value={selectedShop}
                  onChange={(e) => setSelectedShop(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all"
                >
                  <option value="">Seleziona...</option>
                  {shops.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <MapPin size={16} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Seleziona Dipendente</label>
              <div className="relative">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none transition-all"
                  >
                    <option value="">Seleziona...</option>
                    {employees.filter(e => !selectedShop || (e.shopIds || []).includes(selectedShop)).map(e => (
                      <option key={e.id} value={e.id}>{e.nome} {e.cognome}</option>
                    ))}
                  </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <UserIcon size={16} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Fascia Oraria</label>
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setShiftType('morning')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all ${
                    shiftType === 'morning' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Mattina
                </button>
                <button
                  type="button"
                  onClick={() => setShiftType('afternoon')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all ${
                    shiftType === 'afternoon' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Pomeriggio
                </button>
                <button
                  type="button"
                  onClick={() => setShiftType('full-day')}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase rounded-xl transition-all ${
                    shiftType === 'full-day' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Giorno
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full mt-8 bg-indigo-600 text-white font-bold py-5 rounded-2xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-indigo-200 active:scale-[0.98] flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
        >
          <Plus size={20} /> Salva Turno
        </button>
      </form>

      {/* List / Edit Shifts */}
      <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
        <h3 className="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider">Turni di oggi ({date})</h3>
        
        {shifts.length === 0 ? (
          <p className="text-center text-slate-400 text-xs italic py-4">Nessun turno programmato per questa data</p>
        ) : (
          <div className="space-y-3">
            {shifts.map(shift => {
              const emp = employees.find(e => e.id === shift.userId);
              const isEditing = editingShiftId === shift.id;
              
              return (
                <div key={shift.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-indigo-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{emp ? `${emp.nome} ${emp.cognome}` : 'Ex Dipendente'}</p>
                      {isEditing ? (
                        <div className="flex gap-2 mt-1">
                          <button 
                            onClick={() => handleUpdateShift(shift.id, 'morning')}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${shift.shiftType === 'morning' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                          >
                            MATTINA
                          </button>
                          <button 
                            onClick={() => handleUpdateShift(shift.id, 'afternoon')}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${shift.shiftType === 'afternoon' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                          >
                            POMERIGGIO
                          </button>
                          <button 
                            onClick={() => handleUpdateShift(shift.id, 'full-day')}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${shift.shiftType === 'full-day' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}
                          >
                            GIORNO
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">
                          {shift.shiftType === 'morning' ? 'Mattina' : shift.shiftType === 'afternoon' ? 'Pomeriggio' : 'Intera Giornata'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button 
                        onClick={() => setEditingShiftId(null)}
                        className="p-2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => setEditingShiftId(shift.id)}
                          className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                          title="Modifica"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteShift(shift.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deletion Modal */}
      <AnimatePresence>
        {shiftToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-200 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Trash2 className="text-red-600 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Elimina Turno</h3>
              <p className="text-slate-500 text-sm mb-6">Sei sicuro di voler eliminare questo turno? L'azione è irreversibile.</p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShiftToDelete(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDeleteShift}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                >
                  Elimina
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
