import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { Shop } from '../types';
import { motion } from 'motion/react';
import { Building2, Calendar, Plus, Trash2, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function ShopManager() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [newShopName, setNewShopName] = useState('');
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [holidayDate, setHolidayDate] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shops'), (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop)));
    });
    return () => unsubscribe();
  }, []);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;
    try {
      await addDoc(collection(db, 'shops'), {
        name: newShopName,
        closedHolidays: []
      });
      setNewShopName('');
    } catch (error) {
      console.error("Error creating shop:", error);
    }
  };

  const handleUpdateName = async (shop: Shop, newName: string) => {
    try {
      await updateDoc(doc(db, 'shops', shop.id), { name: newName });
    } catch (error) {
      console.error("Error updating shop:", error);
    }
  };

  const handleAddHoliday = async (shop: Shop) => {
    if (!holidayDate) return;
    const holidays = shop.closedHolidays || [];
    if (holidays.includes(holidayDate)) return;

    try {
      const updatedHolidays = [...holidays, holidayDate].sort();
      await updateDoc(doc(db, 'shops', shop.id), { closedHolidays: updatedHolidays });
      setHolidayDate('');
    } catch (error) {
      console.error("Error adding holiday:", error);
    }
  };

  const handleRemoveHoliday = async (shopId: string, date: string) => {
    const shop = shops.find(s => s.id === shopId);
    if (!shop) return;
    const holidays = shop.closedHolidays || [];
    try {
      await updateDoc(doc(db, 'shops', shopId), {
        closedHolidays: holidays.filter(d => d !== date)
      });
    } catch (error) {
      console.error("Error removing holiday:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-800">Gestione Negozi & Chiusure</h2>
      </div>

      {/* Creazione Negozio */}
      <form onSubmit={handleCreateShop} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex gap-3">
        <input
          type="text"
          value={newShopName}
          onChange={(e) => setNewShopName(e.target.value)}
          placeholder="Nome nuovo negozio..."
          className="flex-1 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          id="new-shop-input"
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
          id="add-shop-btn"
        >
          <Plus size={16} /> Aggiungi
        </button>
      </form>

      {/* Lista Negozi */}
      <div className="grid gap-4 md:grid-cols-2">
        {shops.map((shop) => (
          <motion.div
            key={shop.id}
            layout
            className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              {editingShop?.id === shop.id ? (
                <div className="flex gap-2 w-full">
                  <input
                    autoFocus
                    defaultValue={shop.name}
                    onBlur={(e) => {
                      handleUpdateName(shop, e.target.value);
                      setEditingShop(null);
                    }}
                    className="flex-1 p-1 bg-slate-50 border border-slate-200 rounded text-sm font-bold"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 tracking-tight">{shop.name}</h3>
                  <button onClick={() => setEditingShop(shop)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                    <Edit2 size={14} />
                  </button>
                </div>
              )}
              <span className="text-[10px] bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-bold uppercase tracking-tight">Attivo</span>
            </div>

            <div className="p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Prossime Festività</p>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  id={`holiday-input-${shop.id}`}
                />
                <button
                  onClick={() => handleAddHoliday(shop)}
                  className="bg-slate-100 p-2 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                  id={`add-holiday-${shop.id}`}
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {(shop.closedHolidays || []).length === 0 ? (
                  <p className="text-[10px] text-slate-300 italic font-medium">Nessuna chiusura programmata.</p>
                ) : (
                  (shop.closedHolidays || []).map(date => (
                    <div key={date} className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 px-2.5 py-1.5 rounded-lg text-[10px] font-bold">
                      {format(new Date(date), 'dd MMM yyyy', { locale: it })}
                      <button onClick={() => handleRemoveHoliday(shop.id, date)} className="hover:text-red-900 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
