import React, { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { User } from './types';
import Login from './components/Login';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import ShopManager from './components/ShopManager';
import ShiftCreator from './components/ShiftCreator';
import EmployeeSchedule from './components/EmployeeSchedule';
import EmployeeManager from './components/EmployeeManager';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen to user document
        const unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
          if (snapshot.exists()) {
            const userData = { id: snapshot.id, ...snapshot.data() } as User;
            setCurrentUser(userData);
            
            // Set default tab based on role
            if (userData.role === 'admin') {
              setActiveTab('dashboard');
            } else {
              setActiveTab('schedule');
            }
          } else {
             // Handle case where user document doesn't exist yet (handled in login but safe to have fallback)
             setCurrentUser(null);
          }
          setLoading(false);
        });
        return () => unsubscribeUser();
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (loading || (auth.currentUser && !currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white"
        >
          <Clock size={32} className="animate-spin-slow" />
        </motion.div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  if (!currentUser.isApproved && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-3xl shadow-xl max-w-sm w-full text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-amber-50 rounded-full mx-auto mb-6 flex items-center justify-center">
            <ShieldAlert className="text-amber-500 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Profilo in Sospeso</h1>
          <p className="text-slate-500 mb-8">
            Ciao <span className="font-bold text-slate-900">{currentUser.nome}</span>, il tuo account è in attesa di approvazione da parte di un amministratore.
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Stato</p>
            <div className="flex items-center justify-center gap-2 text-amber-600 font-bold">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              In Attesa di Revisione
            </div>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="mt-8 text-slate-400 text-sm font-medium hover:text-slate-600 underline"
          >
            Esci e riprova più tardi
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <Layout user={currentUser} activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {currentUser.role === 'admin' ? (
            <>
              {activeTab === 'dashboard' && <AdminDashboard />}
              {activeTab === 'employees' && <EmployeeManager />}
              {activeTab === 'shops' && <ShopManager />}
              {activeTab === 'shifts' && <ShiftCreator />}
              {activeTab === 'schedule' && <EmployeeSchedule user={currentUser} />}
            </>
          ) : (
            <>
              {activeTab === 'schedule' && <EmployeeSchedule user={currentUser} />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
