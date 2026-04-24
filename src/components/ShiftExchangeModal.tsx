import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRightLeft, Clock } from 'lucide-react';
import { Shift, User, ShiftExchange } from '../types';
import { collection, addDoc, query, where, getDocs, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, parseISO, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  myShift: Shift;
  allShifts: Shift[];
  employees: Record<string, string>;
  user: User;
}

export default function ShiftExchangeModal({ isOpen, onClose, myShift, allShifts, employees, user }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Find valid shifts to swap with (future shifts of other people in the same shop)
  const eligibleShifts = allShifts.filter(s => {
    if (s.userId === user.id) return false;
    if (s.shopId !== myShift.shopId) return false;
    // Basic date check to ensure it's not in the past
    // For simplicity, we just show all loaded shifts that belong to others
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const handleProposeExchange = async (targetShift: Shift) => {
    setLoading(true);
    setError('');
    
    try {
      // Check if an exchange already exists
      const q = query(
        collection(db, 'shiftExchanges'), 
        where('requesterShiftId', '==', myShift.id),
        where('targetShiftId', '==', targetShift.id),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        setError('Hai già proposto questo scambio.');
        setLoading(false);
        return;
      }

      await addDoc(collection(db, 'shiftExchanges'), {
        requesterId: user.id,
        requesterShiftId: myShift.id,
        targetUserId: targetShift.userId,
        targetShiftId: targetShift.id,
        shopId: myShift.shopId,
        status: 'pending',
        createdAt: new Date().toISOString()
      } as Omit<ShiftExchange, 'id'>);

      setSuccessMsg('Scambio proposto con successo!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError('Errore durante la proposta di scambio.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-0"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full sm:max-w-md rounded-[2.5rem] p-6 shadow-2xl safe-area-bottom"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
              Proponi Scambio
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1">
              Il tuo turno
            </p>
            <p className="font-bold text-slate-900">
              {format(parseISO(myShift.date), 'EEEE d MMMM', { locale: it })}
            </p>
            <p className="text-xs text-slate-500 uppercase tracking-tight">
              {myShift.shiftType === 'morning' ? 'Mattina' : myShift.shiftType === 'afternoon' ? 'Pomeriggio' : 'Intera Giornata'}
            </p>
          </div>

          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            Scegli il turno con cui scambiare
          </h4>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
              {successMsg}
            </div>
          )}

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {eligibleShifts.length === 0 ? (
              <p className="text-sm text-slate-500 italic p-4 text-center">Nessun turno disponibile per lo scambio.</p>
            ) : (
              eligibleShifts.map(shift => (
                <button
                  key={shift.id}
                  onClick={() => handleProposeExchange(shift)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight text-slate-700 group-hover:text-indigo-900">
                      {employees[shift.userId] || 'Collega'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500">
                      {format(parseISO(shift.date), 'dd/MM/yyyy')} • {shift.shiftType === 'morning' ? 'Mattina' : shift.shiftType === 'afternoon' ? 'Pomeriggio' : 'Intero'}
                    </p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-full group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <ArrowRightLeft size={16} />
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
