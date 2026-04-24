import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { User, Shop, Shift } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Store, ChevronRight, ArrowRightLeft } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import ShiftExchangeModal from './ShiftExchangeModal';
import PendingExchanges from './PendingExchanges';

interface Props {
  user: User;
}

export default function EmployeeSchedule({ user }: Props) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShopId, setActiveShopId] = useState<string>('');
  const [employees, setEmployees] = useState<Record<string, string>>({});
  const [selectedMyShift, setSelectedMyShift] = useState<Shift | null>(null);

  const isAdmin = user.role === 'admin';

  // Always show current week
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, []);

  useEffect(() => {
    const unsubscribeShops = onSnapshot(collection(db, 'shops'), (snapshot) => {
      const shopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopsData);
      if (shopsData.length > 0 && !activeShopId) {
        const initial = isAdmin ? shopsData[0].id : (user.shopIds?.[0] || shopsData[0].id);
        setActiveShopId(initial);
      }
    });
    return () => unsubscribeShops();
  }, [isAdmin, user.shopIds, activeShopId]);

  useEffect(() => {
    if (!activeShopId || (!user.isApproved && !isAdmin)) return;

    const qEmployees = query(collection(db, 'users'), where('shopIds', 'array-contains', activeShopId));
    const unsubscribeEmployees = onSnapshot(qEmployees, (snapshot) => {
      const names: Record<string, string> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        names[doc.id] = `${data.nome} ${data.cognome}`;
      });
      setEmployees(names);
    });

    const baseQuery = collection(db, 'shifts');
    let qShifts;

    if (isAdmin || user.canSeeColleagues) {
      qShifts = query(baseQuery, where('shopId', '==', activeShopId));
    } else {
      // Employees who CANNOT see colleagues must filter by their own userId
      // and also shopId to satisfy the composite rule requirements
      qShifts = query(baseQuery, where('shopId', '==', activeShopId), where('userId', '==', user.id));
    }

    const unsubscribeShifts = onSnapshot(qShifts, (snapshot) => {
      setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift)));
    });

    return () => {
      unsubscribeEmployees();
      unsubscribeShifts();
    };
  }, [activeShopId, isAdmin, user.id, user.isApproved]);

  const activeShop = useMemo(() => shops.find(s => s.id === activeShopId), [shops, activeShopId]);
  
  const getDayShifts = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const filtered = shifts.filter(s => s.date === dateStr);
    
    if (!isAdmin && !user.canSeeColleagues) {
      return filtered.filter(s => s.userId === user.id);
    }
    return filtered.sort((a, b) => {
      const order = { 'morning': 1, 'afternoon': 2, 'full-day': 0 };
      return (order[a.shiftType] || 0) - (order[b.shiftType] || 0);
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      {/* SHOP SELECTOR */}
      <div className="flex flex-wrap gap-2 px-1">
        {shops.filter(s => isAdmin || (user.shopIds || []).includes(s.id)).map(s => (
          <button
            key={s.id}
            onClick={() => setActiveShopId(s.id)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeShopId === s.id 
                ? 'bg-slate-900 text-white shadow-lg' 
                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <PendingExchanges user={user} employees={employees} />

      <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 italic-text-none">
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
              Agenda Settimanale
            </h3>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">
              {format(weekDays[0], 'd MMMM', { locale: it })} - {format(weekDays[6], 'd MMMM yyyy', { locale: it })}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-indigo-600 uppercase">Live Update</span>
          </div>
        </div>

        {/* CALENDAR VIEW: RESPONSIVE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const shiftsForDay = getDayShifts(day);
            const isToday = isSameDay(day, new Date());
            const isClosed = activeShop?.closedHolidays.includes(format(day, 'yyyy-MM-dd'));

            return (
              <div 
                key={day.toISOString()} 
                className={`flex flex-col md:min-h-[400px] rounded-[2rem] border transition-all ${
                  isToday ? 'bg-slate-50/50 border-indigo-200 ring-2 ring-indigo-50' : 'bg-white border-slate-100'
                }`}
              >
                {/* Header Giorno */}
                <div className={`p-4 border-b flex md:flex-col items-center justify-between md:justify-center gap-2 ${
                  isToday ? 'border-indigo-100' : 'border-slate-100'
                }`}>
                   <div className="text-left md:text-center">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {format(day, 'EEEE', { locale: it })}
                    </p>
                    <p className={`text-xl font-black ${isToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {format(day, 'd MMM')}
                    </p>
                  </div>
                  {isToday && <div className="bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">Oggi</div>}
                </div>

                {/* Turni del Giorno */}
                <div className="p-4 flex-1 space-y-3">
                  {isClosed ? (
                    <div className="flex flex-col items-center justify-center py-4 md:py-20 opacity-40">
                      <Store size={24} className="text-red-400 mb-2" />
                      <p className="text-[9px] font-black text-red-600 uppercase tracking-tighter">Chiuso</p>
                    </div>
                  ) : shiftsForDay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 md:py-20 opacity-30">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Riposo</p>
                    </div>
                  ) : (
                    shiftsForDay.map(shift => (
                      <motion.div
                        key={shift.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-3 rounded-2xl border relative overflow-hidden group ${
                          shift.userId === user.id 
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                            : 'bg-white border-slate-100 shadow-sm'
                        }`}
                      >
                        <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${
                          shift.userId === user.id ? 'text-white/60' : 'text-slate-400'
                        }`}>
                          {shift.userId === user.id ? 'Tuo Turno' : (employees[shift.userId]?.split(' ')[0] || 'Staff')}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black tracking-tight leading-none uppercase">
                            {shift.shiftType === 'morning' ? 'Mattina' : shift.shiftType === 'afternoon' ? 'Pomeriggio' : 'Giorno Intero'}
                          </p>
                          <Clock size={12} className={shift.userId === user.id ? 'text-white/50' : 'text-slate-300'} />
                        </div>
                        {shift.userId === user.id && (isAdmin || user.canSeeColleagues) && (
                          <div className="mt-2 pt-2 border-t border-indigo-500/30 flex justify-end">
                             <button
                               onClick={() => setSelectedMyShift(shift)}
                               className="flex items-center gap-1 text-[9px] font-bold text-white uppercase tracking-wider hover:text-indigo-200 transition"
                             >
                               <ArrowRightLeft size={10} />
                               Scambia
                             </button>
                          </div>
                        )}
                        {shift.userId === user.id && (
                          <div className="absolute top-0 right-0 p-1 opacity-10 pointer-events-none">
                            <Store size={32} />
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedMyShift && (
        <ShiftExchangeModal
          isOpen={!!selectedMyShift}
          onClose={() => setSelectedMyShift(null)}
          myShift={selectedMyShift}
          allShifts={shifts}
          employees={employees}
          user={user}
        />
      )}
    </div>
  );
}

function UserIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
