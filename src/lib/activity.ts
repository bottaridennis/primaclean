import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import type { ActivityLog, AppNotification, User } from '../types';

/**
 * Registro attività e notifiche.
 * Entrambe le scritture sono "best effort": se falliscono (rete, permessi)
 * l'operazione principale resta valida e l'errore viene solo segnalato in console.
 */

let actor: Pick<User, 'id' | 'nome' | 'cognome'> | null = null;

/** Da chiamare quando il profilo dell'utente corrente è disponibile */
export function setActor(user: Pick<User, 'id' | 'nome' | 'cognome'> | null) {
  actor = user;
}

const actorName = () => (actor ? `${actor.nome} ${actor.cognome}`.trim() : 'Sconosciuto');

export function logActivity(entry: Omit<ActivityLog, 'id' | 'at' | 'actorId' | 'actorName'>) {
  if (!actor) return;
  const data: Record<string, unknown> = {
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: actorName(),
    kind: entry.kind,
    action: entry.action,
  };
  if (entry.details) data.details = entry.details;
  if (entry.shopId) data.shopId = entry.shopId;
  if (entry.targetUserId) data.targetUserId = entry.targetUserId;
  addDoc(collection(db, 'activityLogs'), data).catch(err => console.warn('Registro attività non aggiornato:', err));
}

/** Invia una notifica in-app a un utente (mai a sé stessi) */
export function notify(userId: string | undefined, title: string, body: string, link?: string) {
  if (!actor || !userId || userId === actor.id) return;
  const data: Omit<AppNotification, 'id'> = {
    userId,
    fromId: actor.id,
    fromName: actorName(),
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
    ...(link ? { link } : {}),
  };
  addDoc(collection(db, 'notifications'), data).catch(err => console.warn('Notifica non inviata:', err));
}
