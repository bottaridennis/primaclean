import React from 'react';
import { User } from '../types';
import { auth } from '../lib/firebase';
import { LogOut, User as UserIcon, Shield, LayoutDashboard, Building2, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  user: User;
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ user, children, activeTab, setActiveTab }: Props) {
  const isAdmin = user.role === 'admin';

  const NavContent = () => (
    <>
      {isAdmin ? (
        <>
          <NavButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<Shield size={20} />}
            label="Approv"
            sidebar={true}
          />
          <NavButton
            active={activeTab === 'employees'}
            onClick={() => setActiveTab('employees')}
            icon={<Building2 size={20} />}
            label="Staff"
            sidebar={true}
          />
          <NavButton
            active={activeTab === 'shifts'}
            onClick={() => setActiveTab('shifts')}
            icon={<UserIcon size={20} />}
            label="Turni"
            sidebar={true}
          />
          <NavButton
            active={activeTab === 'logs'}
            onClick={() => setActiveTab('logs')}
            icon={<FileText size={20} />}
            label="Log Scambi"
            sidebar={true}
          />
          <NavButton
            active={activeTab === 'schedule'}
            onClick={() => setActiveTab('schedule')}
            icon={<LayoutDashboard size={20} />}
            label="Calend"
            sidebar={true}
          />
        </>
      ) : (
        <>
          <NavButton
            active={activeTab === 'schedule'}
            onClick={() => setActiveTab('schedule')}
            icon={<LayoutDashboard size={20} />}
            label="Turni"
            sidebar={true}
          />
          <NavButton
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            icon={<UserIcon size={20} />}
            label="Profilo"
            sidebar={true}
          />
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-50 p-6">
        <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-100">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Shield size={20} />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-tight uppercase truncate">PrimaClean</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">dennisbottari.it</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavContent />
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex-shrink-0 flex items-center justify-center">
              <UserIcon size={20} className="text-slate-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{user.nome} {user.cognome}</p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight truncate">
                {isAdmin ? 'Admin' : 'Dipendente'}
              </p>
            </div>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
          >
            <LogOut size={20} />
            <span className="text-xs font-bold uppercase tracking-widest">Esci</span>
          </button>
        </div>
      </aside>

      {/* Mobile/Desktop Content Area */}
      <div className="flex-1 md:ml-64">
        {/* Mobile Header (Hidden on Desktop) */}
        <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Shield size={16} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight uppercase">PrimaClean</h1>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="p-2 text-slate-400 hover:text-red-600 active:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
          </button>
        </header>

        {/* Desktop Top Area (Breadcrumbs/Title - optional but keeping it clean) */}
        <div className="hidden md:block p-8 pb-0">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
            {activeTab === 'dashboard' ? 'Pannello di Controllo' : 
             activeTab === 'employees' ? 'Gestione Staff' :
             activeTab === 'shops' ? 'Negozi & Sedi' :
             activeTab === 'shifts' ? 'Pianificazione Turni' :
             activeTab === 'logs' ? 'Log Scambi Turno' :
             activeTab === 'schedule' ? 'Agenda Settimanale' : 'Il mio Profilo'}
          </h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Bentornato, {user.nome}</p>
        </div>

        <main className="p-4 md:p-8 pb-32 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Hidden on Desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around items-end px-4 pt-3 pb-safe z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] h-20">
        <NavContent />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, sidebar }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sidebar?: boolean }) {
  if (sidebar) {
    // Desktop Sidebar version
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group outline-none ${
          active 
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
        }`}
      >
        <div className={`transition-transform group-hover:scale-110 ${active ? 'text-white' : ''}`}>
          {icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-widest">{label === 'Approv' ? 'Approvazioni' : label === 'Calend' ? 'Calendario' : label}</span>
        {active && (
          <motion.div 
            layoutId="active-indicator"
            className="ml-auto w-1.5 h-6 bg-white/40 rounded-full" 
          />
        )}
      </button>
    );
  }

  // Mobile version (original logic but shared)
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
