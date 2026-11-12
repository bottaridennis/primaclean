import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  CalendarRange,
  CalendarDays,
  Users,
  Store,
  ArrowLeftRight,
  UserRound,
  LogOut,
  Menu,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { usePendingUsers } from '../lib/hooks';
import { cn, fullName } from '../lib/utils';
import type { User } from '../types';
import { Logo, LogoMark } from './ui/Logo';
import { Avatar } from './ui/Avatar';
import { Modal } from './ui/Modal';

export type TabId = 'dashboard' | 'planner' | 'schedule' | 'staff' | 'shops' | 'exchanges' | 'profile';

interface NavItem {
  id: TabId;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  /** Mostrata nella barra inferiore su mobile */
  primary?: boolean;
}

export function navItemsFor(user: User): NavItem[] {
  if (user.role === 'admin') {
    return [
      { id: 'dashboard', label: 'Panoramica', shortLabel: 'Home', icon: LayoutDashboard, primary: true },
      { id: 'planner', label: 'Planner turni', shortLabel: 'Planner', icon: CalendarRange, primary: true },
      { id: 'schedule', label: 'Agenda negozi', shortLabel: 'Agenda', icon: CalendarDays, primary: true },
      { id: 'staff', label: 'Personale', shortLabel: 'Staff', icon: Users, primary: true },
      { id: 'shops', label: 'Negozi e chiusure', shortLabel: 'Negozi', icon: Store },
      { id: 'exchanges', label: 'Storico scambi', shortLabel: 'Scambi', icon: ArrowLeftRight },
      { id: 'profile', label: 'Il mio profilo', shortLabel: 'Profilo', icon: UserRound },
    ];
  }
  return [
    { id: 'schedule', label: 'I miei turni', shortLabel: 'Turni', icon: CalendarDays, primary: true },
    { id: 'profile', label: 'Il mio profilo', shortLabel: 'Profilo', icon: UserRound, primary: true },
  ];
}

interface Props {
  user: User;
  children: ReactNode;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

export default function Layout({ user, children, activeTab, onNavigate }: Props) {
  const isAdmin = user.role === 'admin';
  const items = navItemsFor(user);
  const primary = items.filter(i => i.primary);
  const secondary = items.filter(i => !i.primary);
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: pending } = usePendingUsers(isAdmin);
  const badges: Partial<Record<TabId, number>> = isAdmin ? { dashboard: pending.length, staff: pending.length } : {};

  const go = (id: TabId) => {
    setMoreOpen(false);
    onNavigate(id);
  };

  return (
    <div className="min-h-dvh bg-linen">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-[272px] h-dvh fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200/70">
        <div className="px-6 h-20 flex items-center border-b border-slate-100">
          <Logo />
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1" aria-label="Navigazione principale">
          {isAdmin && <p className="eyebrow px-3 mb-2">Gestione</p>}
          {items
            .filter(i => i.id !== 'profile')
            .map(item => (
              <SidebarLink
                key={item.id}
                item={item}
                active={activeTab === item.id}
                badge={badges[item.id]}
                onClick={() => go(item.id)}
              />
            ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <button
            onClick={() => go('profile')}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors',
              activeTab === 'profile' ? 'bg-brand-50' : 'hover:bg-slate-50',
            )}
          >
            <Avatar user={user} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{fullName(user)}</p>
              <p className="text-xs font-medium text-brand-600">{isAdmin ? 'Amministratore' : 'Dipendente'}</p>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </button>
          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-4 h-11 rounded-2xl text-sm font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={18} /> Esci
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/70">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-9" />
            <p className="text-[17px] font-extrabold tracking-tight text-brand-950">
              Prima<span className="text-brand-600">Clean</span>
            </p>
          </div>
          <button onClick={() => go('profile')} className="rounded-full" aria-label="Il mio profilo">
            <Avatar user={user} size="sm" className={activeTab === 'profile' ? 'ring-2 ring-brand-500 ring-offset-2' : ''} />
          </button>
        </div>
      </header>

      <main className="md:ml-[272px] px-4 py-6 md:px-10 md:py-10 pb-32 md:pb-12">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Barra di navigazione mobile */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/70 pb-safe"
        aria-label="Navigazione principale"
      >
        <div className="flex items-stretch justify-around px-2 pt-1.5">
          {primary.map(item => (
            <BottomLink
              key={item.id}
              item={item}
              active={activeTab === item.id}
              badge={badges[item.id]}
              onClick={() => go(item.id)}
            />
          ))}
          {secondary.length > 0 && (
            <BottomLink
              item={{ id: 'profile', label: 'Altro', shortLabel: 'Altro', icon: Menu }}
              active={secondary.some(s => s.id === activeTab)}
              onClick={() => setMoreOpen(true)}
            />
          )}
        </div>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Altre sezioni">
        <div className="space-y-1 -mx-2">
          {secondary.map(item => (
            <SidebarLink key={item.id} item={item} active={activeTab === item.id} onClick={() => go(item.id)} />
          ))}
          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-3 h-12 rounded-2xl text-[15px] font-semibold text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={20} /> Esci
          </button>
        </div>
      </Modal>
    </div>
  );
}

function SidebarLink({ item, active, badge, onClick }: { item: NavItem; active: boolean; badge?: number; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 h-12 rounded-2xl text-[15px] font-semibold transition-colors',
        active ? 'bg-brand-600 text-white shadow-sm shadow-brand-900/10' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
      )}
    >
      <Icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
      <span className="flex-1 text-left">{item.label}</span>
      {!!badge && (
        <span
          className={cn(
            'min-w-6 h-6 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
            active ? 'bg-white text-brand-700' : 'bg-amber-100 text-amber-700',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function BottomLink({ item, active, badge, onClick }: { item: NavItem; active: boolean; badge?: number; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex-1 flex flex-col items-center gap-1 py-1.5 min-w-0 text-[11px] font-semibold transition-colors',
        active ? 'text-brand-700' : 'text-slate-500',
      )}
    >
      <span className={cn('h-8 w-14 rounded-full flex items-center justify-center transition-colors', active && 'bg-brand-100')}>
        <Icon size={21} strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className="truncate max-w-full">{item.shortLabel ?? item.label}</span>
      {!!badge && (
        <span className="absolute top-0.5 left-1/2 ml-2 min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
          {badge}
        </span>
      )}
    </button>
  );
}
