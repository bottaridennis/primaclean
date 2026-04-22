import React from 'react';
import { User } from '../types';
import { auth } from '../lib/firebase';
import { LogOut, User as UserIcon, Shield, LayoutDashboard, Building2 } from 'lucide-react';

interface Props {
  user: User;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ user, children, activeTab, setActiveTab }: Props) {
  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Bento Header */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">PRIMA-CLEAN</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gestione Turni Aziendali</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{user.nome} {user.cognome}</p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight">
                {isAdmin ? 'Dashboard Amministratore' : 'Area Dipendente'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center">
               <UserIcon size={20} className="text-slate-400" />
            </div>
            <button
              onClick={() => auth.signOut()}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all ml-2"
              title="Esci"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="pb-24">
          {children}
        </main>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-end px-4 pt-3 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] h-20">
        {isAdmin ? (
          <>
            <NavButton
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<Shield size={20} />}
              label="Approv"
            />
            <NavButton
              active={activeTab === 'employees'}
              onClick={() => setActiveTab('employees')}
              icon={<Building2 size={20} />}
              label="Staff"
            />
            <NavButton
              active={activeTab === 'shifts'}
              onClick={() => setActiveTab('shifts')}
              icon={<UserIcon size={20} />}
              label="Turni"
            />
            <NavButton
              active={activeTab === 'schedule'}
              onClick={() => setActiveTab('schedule')}
              icon={<LayoutDashboard size={20} />}
              label="Calend"
            />
          </>
        ) : (
          <>
            <NavButton
              active={activeTab === 'schedule'}
              onClick={() => setActiveTab('schedule')}
              icon={<LayoutDashboard size={20} />}
              label="Turni"
            />
            <NavButton
              active={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              icon={<UserIcon size={20} />}
              label="Profilo"
            />
          </>
        )}
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center flex-1 transition-all outline-none ${active ? 'text-indigo-600' : 'text-slate-400'}`}
    >
      <div className={`p-2.5 rounded-2xl transition-all ${active ? 'bg-indigo-50 shadow-sm' : ''}`}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter transform scale-90">{label}</span>
      {active && <div className="w-1 h-1 bg-indigo-600 rounded-full mt-0.5" />}
    </button>
  );
}
