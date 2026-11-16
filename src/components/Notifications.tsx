import { useEffect, useMemo, useRef, useState } from 'react';
import { collection, deleteDoc, doc, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { Bell, BellOff, BellRing, CheckCheck } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLiveQuery } from '../lib/hooks';
import { cn, fmt, safeStorage } from '../lib/utils';
import type { AppNotification, User } from '../types';
import type { TabId } from './Layout';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/Primitives';
import { useToast } from './ui/Toast';

const supported = typeof window !== 'undefined' && 'Notification' in window;

/** Mostra una notifica di sistema (tramite service worker quando disponibile, necessario su Android) */
async function showSystemNotification(n: AppNotification) {
  if (!supported || Notification.permission !== 'granted') return;
  const options: NotificationOptions = { body: n.body, icon: './icon-192.png', badge: './icon-192.png', tag: n.id, data: { link: n.link } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(n.title, options);
  } catch {
    /* fallback sotto */
  }
  try {
    new Notification(n.title, options);
  } catch {
    /* alcuni browser mobili non permettono il costruttore */
  }
}

function relative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'adesso';
  if (diff < 60) return `${Math.floor(diff)} min fa`;
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} h fa`;
  return fmt(iso, "d MMM 'alle' HH:mm");
}

export function NotificationBell({ user, onNavigate, className }: { user: User; onNavigate: (t: TabId) => void; className?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported');
  const { data, loading } = useLiveQuery<AppNotification>(
    () => query(collection(db, 'notifications'), where('userId', '==', user.id)),
    `notifications-${user.id}`,
  );
  const items = useMemo(() => [...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data]);
  const unread = items.filter(n => !n.read);

  // Notifiche di sistema per i nuovi arrivi (non per quelle già presenti all'apertura)
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (loading) return;
    if (seen.current === null) {
      seen.current = new Set(data.map(n => n.id));
      return;
    }
    const fresh = data.filter(n => !n.read && !seen.current!.has(n.id));
    fresh.forEach(n => {
      seen.current!.add(n.id);
      if (document.hidden) showSystemNotification(n);
      else toast.info(`${n.title}: ${n.body}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading]);

  // Pulizia: elimina le notifiche lette più vecchie di 30 giorni (una volta al giorno)
  useEffect(() => {
    const key = `pc-notif-cleanup-${user.id}`;
    const today = new Date().toISOString().slice(0, 10);
    if (!data.length || safeStorage.get(key) === today) return;
    safeStorage.set(key, today);
    const limit = new Date(Date.now() - 30 * 86400000).toISOString();
    data.filter(n => n.read && n.createdAt < limit).forEach(n => deleteDoc(doc(db, 'notifications', n.id)).catch(() => {}));
  }, [data, user.id]);

  const markAll = async () => {
    if (!unread.length) return;
    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }));
    try {
      await batch.commit();
    } catch (err) {
      toast.error(err);
    }
  };

  const openItem = (n: AppNotification) => {
    if (!n.read) updateDoc(doc(db, 'notifications', n.id), { read: true }).catch(() => {});
    setOpen(false);
    if (n.link) onNavigate(n.link as TabId);
  };

  const enableSystem = async () => {
    if (!supported) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === 'granted') toast.success('Notifiche attivate su questo dispositivo.');
    else if (p === 'denied') toast.error('Notifiche bloccate. Puoi riattivarle dalle impostazioni del browser.');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn('relative btn-icon text-slate-600', className)}
        aria-label={unread.length ? `Notifiche, ${unread.length} da leggere` : 'Notifiche'}
      >
        <Bell size={21} />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Notifiche"
        description="Turni nuovi o annullati, proposte e risposte agli scambi."
      >
        <div className="space-y-4">
          {permission === 'default' && (
            <div className="flex items-start gap-3 rounded-2xl bg-brand-50 border border-brand-200 p-4">
              <BellRing size={20} className="text-brand-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-900">Ricevi gli avvisi anche fuori dall'app</p>
                <p className="text-[13px] text-brand-900/70 mt-0.5">
                  Il telefono o il computer ti avviserà quando l'app è aperta in un'altra scheda o in background.
                </p>
                <button className="btn btn-primary btn-sm mt-3" onClick={enableSystem}>
                  Attiva notifiche
                </button>
              </div>
            </div>
          )}
          {permission === 'denied' && (
            <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-3 text-[13px] text-slate-500">
              <BellOff size={16} className="shrink-0 mt-0.5" /> Le notifiche del dispositivo sono bloccate. Le trovi comunque qui.
            </p>
          )}

          {items.length === 0 ? (
            <EmptyState icon={Bell} title="Nessuna notifica" description="Qui comparirà ogni cambiamento che ti riguarda." className="py-8" />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{unread.length ? `${unread.length} da leggere` : 'Tutte lette'}</p>
                <button className="btn btn-ghost btn-sm" onClick={markAll} disabled={!unread.length}>
                  <CheckCheck size={16} /> Segna tutte come lette
                </button>
              </div>
              <ul className="-mx-2 space-y-1">
                {items.slice(0, 50).map(n => (
                  <li key={n.id}>
                    <button
                      onClick={() => openItem(n)}
                      className={cn('w-full flex gap-3 rounded-2xl p-3 text-left transition-colors', n.read ? 'hover:bg-slate-50' : 'bg-brand-50/70 hover:bg-brand-50')}
                    >
                      <span className={cn('mt-1.5 size-2.5 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-brand-500')} />
                      <span className="flex-1 min-w-0">
                        <span className={cn('block text-sm', n.read ? 'text-slate-700' : 'font-bold text-slate-900')}>{n.title}</span>
                        <span className="block text-[13px] text-slate-500">{n.body}</span>
                        <span className="block text-[12px] text-slate-400 mt-0.5">
                          {n.fromName} · {relative(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
