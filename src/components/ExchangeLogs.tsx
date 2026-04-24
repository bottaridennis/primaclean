import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExchangeLog } from '../types';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { ArrowRightLeft, Clock } from 'lucide-react';

export default function ExchangeLogs() {
  const [logs, setLogs] = useState<ExchangeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(
          collection(db, 'exchangeLogs'),
          orderBy('acceptedAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const fetchedLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ExchangeLog));
        
        setLogs(fetchedLogs);
      } catch (err) {
        console.error("Error fetching logs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Clock className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  const shiftTypeLabels = {
    'morning': 'Mattina',
    'afternoon': 'Pomeriggio',
    'full-day': 'Tutto il Giorno'
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Storico Scambi</h3>
          <p className="text-sm text-slate-500">Ultimi 50 scambi di turni approvati.</p>
        </div>
        
        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nessuno scambio registrato finora.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={log.id} 
                className="p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex gap-6 items-center flex-col md:flex-row">
                  
                  {/* Tempo Accettazione */}
                  <div className="text-[10px] text-slate-400 font-bold uppercase w-full md:w-32 flex-shrink-0">
                    <p>{format(parseISO(log.acceptedAt), 'dd MMM yyyy', { locale: it })}</p>
                    <p>{format(parseISO(log.acceptedAt), 'HH:mm', { locale: it })}</p>
                  </div>

                  <div className="flex-1 w-full flex flex-col md:flex-row items-center gap-4 bg-slate-100/50 p-4 rounded-2xl">
                    {/* Requester */}
                    <div className="flex-1 text-center md:text-right">
                      <p className="font-bold text-slate-900">{log.requesterName}</p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(log.requesterShiftDate), 'dd MMM', { locale: it })} &middot; {shiftTypeLabels[log.requesterShiftType as 'morning' | 'afternoon' | 'full-day']}
                      </p>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-200">
                      <ArrowRightLeft size={14} className="text-indigo-400" />
                    </div>

                    {/* Target */}
                    <div className="flex-1 text-center md:text-left">
                      <p className="font-bold text-slate-900">{log.targetUserName}</p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(log.targetShiftDate), 'dd MMM', { locale: it })} &middot; {shiftTypeLabels[log.targetShiftType as 'morning' | 'afternoon' | 'full-day']}
                      </p>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
