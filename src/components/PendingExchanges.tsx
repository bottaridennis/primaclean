import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { ShiftExchange, User, Shift } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRightLeft, Check, X, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  user: User;
  employees: Record<string, string>;
}

export default function PendingExchanges({ user, employees }: Props) {
  const [exchanges, setExchanges] = useState<ShiftExchange[]>([]);
  const [shiftsCache, setShiftsCache] = useState<Record<string, Shift>>({});

  useEffect(() => {
    if (!user.isApproved && user.role !== 'admin') return;

    // Listen for exchanges where I am the TARGET and status is pending
    const qTarget = query(
      collection(db, 'shiftExchanges'),
      where('targetUserId', '==', user.id),
      where('status', '==', 'pending')
    );

    // Also listen to exchanges where I am the REQUESTER (to show status)
    const qRequester = query(
      collection(db, 'shiftExchanges'),
      where('requesterId', '==', user.id),
      where('status', '==', 'pending')
    );

    const handleExchanges = (docs: any[]) => {
      setExchanges(prev => {
        const newMap = new Map(prev.map(e => [e.id, e]));
        docs.forEach(doc => newMap.set(doc.id, { id: doc.id, ...doc.data() } as ShiftExchange));
        return Array.from(newMap.values()).filter(e => e.status === 'pending');
      });
    };

    const unsubTarget = onSnapshot(qTarget, (snap) => handleExchanges(snap.docs));
    const unsubReq = onSnapshot(qRequester, (snap) => handleExchanges(snap.docs));

    return () => {
      unsubTarget();
      unsubReq();
    };
  }, [user.id]);

  // Fetch shift details when we get new exchanges
  useEffect(() => {
    if (exchanges.length === 0) return;

    const fetchShifts = async () => {
      const neededIds = new Set<string>();
      exchanges.forEach(e => {
        if (!shiftsCache[e.requesterShiftId]) neededIds.add(e.requesterShiftId);
        if (!shiftsCache[e.targetShiftId]) neededIds.add(e.targetShiftId);
      });

      if (neededIds.size === 0) return;

      const newCache = { ...shiftsCache };
      for (const id of neededIds) {
        try {
          const docRef = doc(db, 'shifts', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            newCache[id] = { id: docSnap.id, ...docSnap.data() } as Shift;
          }
        } catch (err) {
          console.error("Error fetching shift", err);
        }
      }
      setShiftsCache(newCache);
    };

    fetchShifts();
  }, [exchanges]);

  const handleAction = async (exchange: ShiftExchange, action: 'accepted' | 'rejected') => {
    try {
      if (action === 'rejected') {
        await updateDoc(doc(db, 'shiftExchanges', exchange.id), { status: 'rejected' });
        setExchanges(prev => prev.filter(e => e.id !== exchange.id));
        return;
      }

      if (action === 'accepted') {
        const batch = writeBatch(db);
        
        // Update exchange status
        batch.update(doc(db, 'shiftExchanges', exchange.id), { status: 'accepted' });

        // Swap the userIds of the two shifts
        // requesterShift gives to targetUserId
        // targetShift gives to requesterId
        const reqShiftRef = doc(db, 'shifts', exchange.requesterShiftId);
        const tgtShiftRef = doc(db, 'shifts', exchange.targetShiftId);

        batch.update(reqShiftRef, { userId: exchange.targetUserId });
        batch.update(tgtShiftRef, { userId: exchange.requesterId });

        // Create an exchange log
        const reqShift = shiftsCache[exchange.requesterShiftId];
        const tgtShift = shiftsCache[exchange.targetShiftId];

        if (reqShift && tgtShift) {
          const logRef = doc(collection(db, 'exchangeLogs'));
          batch.set(logRef, {
            requesterId: exchange.requesterId,
            requesterName: employees[exchange.requesterId] || 'Sconosciuto',
            targetUserId: exchange.targetUserId,
            targetUserName: employees[exchange.targetUserId] || 'Sconosciuto',
            requesterShiftDate: reqShift.date,
            requesterShiftType: reqShift.shiftType,
            targetShiftDate: tgtShift.date,
            targetShiftType: tgtShift.shiftType,
            shopId: exchange.shopId,
            acceptedAt: new Date().toISOString()
          });
        }

        await batch.commit();
        setExchanges(prev => prev.filter(e => e.id !== exchange.id));
      }
    } catch (err) {
      console.error("Error handling exchange action:", err);
    }
  };

  if (exchanges.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      {exchanges.map(exchange => {
        const isRequester = exchange.requesterId === user.id;
        const myShift = shiftsCache[isRequester ? exchange.requesterShiftId : exchange.targetShiftId];
        const theirShift = shiftsCache[isRequester ? exchange.targetShiftId : exchange.requesterShiftId];
        const otherUserId = isRequester ? exchange.targetUserId : exchange.requesterId;
        const otherUserName = employees[otherUserId] || 'Collega';

        if (!myShift || !theirShift) return null;

        return (
          <motion.div
            key={exchange.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-3xl border-2 shadow-sm ${
              isRequester ? 'bg-amber-50/50 border-amber-100' : 'bg-indigo-50 border-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className={`text-xs font-black uppercase tracking-widest ${
                isRequester ? 'text-amber-600' : 'text-indigo-600'
              }`}>
                {isRequester ? 'Proposta in attesa' : `Richiesta da ${otherUserName}`}
              </h4>
              <ArrowRightLeft className={isRequester ? "text-amber-400" : "text-indigo-400"} size={16} />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">
                  Tu cedi:
                </p>
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <p className="font-bold text-slate-800 text-sm">
                    {format(parseISO(myShift.date), 'dd MMM', { locale: it })}
                  </p>
                  <p className="text-xs text-slate-500 uppercase">
                     {myShift.shiftType === 'morning' ? 'Mattina' : myShift.shiftType === 'afternoon' ? 'Pomeriggio' : 'Intero'}
                  </p>
                </div>
              </div>

              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-1">
                  {isRequester ? 'E ricevi:' : 'In cambio di:'}
                </p>
                <div className="bg-white p-3 rounded-2xl border border-slate-100">
                  <p className="font-bold text-slate-800 text-sm">
                    {format(parseISO(theirShift.date), 'dd MMM', { locale: it })}
                  </p>
                  <p className="text-xs text-slate-500 uppercase">
                     {theirShift.shiftType === 'morning' ? 'Mattina' : theirShift.shiftType === 'afternoon' ? 'Pomeriggio' : 'Intero'}
                  </p>
                </div>
              </div>
            </div>

            {!isRequester && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAction(exchange, 'accepted')}
                  className="flex-1 bg-indigo-600 text-white font-black uppercase tracking-widest py-3 rounded-2xl hover:bg-indigo-700 transition flex justify-center items-center gap-2"
                >
                  <Check size={18} />
                  <span>Accetta</span>
                </button>
                <button
                  onClick={() => handleAction(exchange, 'rejected')}
                  className="px-6 bg-white text-slate-400 border border-slate-200 font-bold uppercase tracking-widest py-3 rounded-2xl hover:bg-slate-50 hover:text-slate-600 transition flex justify-center items-center"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {isRequester && (
               <div className="flex gap-2 mt-4">
                 <button
                  onClick={() => handleAction(exchange, 'rejected')}
                  className="w-full bg-white text-slate-400 border border-slate-200 font-bold uppercase tracking-widest text-[10px] py-2 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"
                >
                  Annulla Richiesta
                </button>
               </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
