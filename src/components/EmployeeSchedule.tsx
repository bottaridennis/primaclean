import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { User, Shop, Shift } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, Store, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

interface Props {
  user: User;
}

export default function EmployeeSchedule({ user }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [activeShopId, setActiveShopId] = useState<string>('');
  const [employees, setEmployees] = useState<Record<string, string>>({});
  const horizontalNavRef = useRef<HTMLDivElement>(null);

  const isAdmin = user.role === 'admin';

  // Generate 14 days initially (this week and next)
  const calendarDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 14 }, (_, i) => addDays(start, i));
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

    // Colleagues for the shop
    const qEmployees = query(collection(db, 'users'), where('shopIds', 'array-contains', activeShopId));
    const unsubscribeEmployees = onSnapshot(qEmployees, (snapshot) => {
      const names: Record<string, string> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        names[doc.id] = `${data.nome} ${data.cognome}`;
      });
      setEmployees(names);
    });

    const unsubscribeShifts = onSnapshot(
      query(collection(db, 'shifts'), where('shopId', '==', activeShopId)),
      (snapshot) => {
        setShifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift)));
      }
    );

    return () => {
      unsubscribeEmployees();
      unsubscribeShifts();
    };
  }, [activeShopId, isAdmin, user.id, user.isApproved]);

  const activeShop = useMemo(() => shops.find(s => s.id === activeShopId), [shops, activeShopId]);
  
  const dayShifts = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const filtered = shifts.filter(s => s.date === dateStr);
    
    // If not admin and not allowed to see colleagues, filter strictly
    if (!isAdmin && !user.canSeeColleagues) {
      return filtered.filter(s => s.userId === user.id);
    }
    return filtered.sort((a, b) => {
      const order = { 'morning': 1, 'afternoon': 2, 'full-day': 0 };
      return order[a.shiftType] - order[b.shiftType];
    });
  }, [shifts, selectedDate, isAdmin, user.id, user.canSeeColleagues]);

  const isHoliday = activeShop?.closedHolidays.includes(format(selectedDate, 'yyyy-MM-dd'));

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto pb-10">
      {/* SHOP SELECTOR SLIDER */}
      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide px-1">
        {shops.filter(s => isAdmin || (user.shopIds || []).includes(s.id)).map(s => (
          <button
            key={s.id}
            onClick={() => setActiveShopId(s.id)}
            className={`flex-shrink-0 px-5 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
              activeShopId === s.id 
                ? 'bg-slate-900 text-white shadow-xl scale-105' 
                : 'bg-white text-slate-400 border border-slate-100'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* TOUCH-FRIENDLY CALENDAR ROW */}
      <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
            {format(selectedDate, 'MMMM yyyy', { locale: it })}
          </h3>
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
        </div>
        
        <div 
          ref={horizontalNavRef}
          className="flex overflow-x-auto gap-4 pb-2 snap-x snap-mandatory scrollbar-hide px-2"
        >
          {calendarDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`snap-center flex-shrink-0 flex flex-col items-center gap-1 w-12 py-3 rounded-2xl transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-110' 
                    : 'text-slate-400'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{format(day, 'EEE', { locale: it })}</span>
                <span className="text-base font-black leading-none">{format(day, 'd')}</span>
                {isToday && !isSelected && <div className="w-1 h-1 bg-indigo-500 rounded-full" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* SHIFTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Programmazione Odierna</p>
          <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
            {dayShifts.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDate.toISOString() + activeShopId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {isHoliday ? (
              <div className="bg-red-50/50 border-2 border-dashed border-red-200 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center">
                <Store className="text-red-300 w-12 h-12 mb-3" />
                <p className="text-red-700 font-black text-sm uppercase tracking-tight">Negozio Chiuso</p>
                <p className="text-red-400 text-xs italic">Oggi il punto vendita non effettuerà aperture.</p>
              </div>
            ) : dayShifts.length === 0 ? (
              <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center">
                <p className="text-slate-400 font-black text-sm uppercase tracking-tight">Nessun Turno</p>
                <p className="text-slate-300 text-xs italic italic-text-none">Aggiungi un turno per iniziare.</p>
              </div>
            ) : (
              dayShifts.map(shift => (
                <div 
                  key={shift.id}
                  className={`relative overflow-hidden bg-white p-5 rounded-[2rem] shadow-sm border flex items-center justify-between group active:scale-[0.98] transition-all ${
                    shift.userId === user.id ? 'border-indigo-100 ring-4 ring-indigo-50/30' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                      shift.userId === user.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {shift.userId === user.id ? <Clock size={24} /> : <UserIcon size={24} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight">
                        {shift.userId === user.id ? 'Il tuo Turno' : (employees[shift.userId] || 'Collaboratore')}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Store size={12} className="text-slate-300" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeShop?.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-widest ${
                      shift.shiftType === 'morning' ? 'bg-amber-50 text-amber-600' : 
                      shift.shiftType === 'afternoon' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {shift.shiftType === 'morning' ? 'Mattina' : shift.shiftType === 'afternoon' ? 'Pomeriggio' : 'Tutta Giorno'}
                    </div>
                    <p className="text-[10px] font-bold text-slate-300 mt-1 uppercase italic-text-none">
                      {shift.shiftType === 'full-day' ? '9:00 - 19:30' : shift.shiftType === 'morning' ? '9:00 - 13:00' : '15:30 - 19:30'}
                    </p>
                  </div>

                  {shift.userId === user.id && (
                    <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600" />
                  )}
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* QUICK INFO - LEGACY BOX */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4 text-center">Riepilogo Prossimo Turno</p>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-black italic italic-text-none">Domani</p>
              <p className="text-[10px] font-bold text-indigo-400 uppercase mt-1">Negozio Centrale</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-black text-indigo-400 italic italic-text-none">Mattina</p>
              <p className="text-[10px] font-bold text-white/40 uppercase mt-1">9:00 AM</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
      </div>
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
