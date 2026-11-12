import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where, type Query, type DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { Shop, User } from '../types';

interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

/**
 * Sottoscrizione realtime a una query Firestore.
 * `key` identifica la query: quando cambia, il listener viene ricreato.
 * Passare `null` come factory per disattivare la sottoscrizione.
 */
export function useLiveQuery<T extends { id: string }>(
  factory: (() => Query<DocumentData>) | null,
  key: string,
): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({ data: [], loading: !!factory, error: null });

  useEffect(() => {
    if (!factory) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState(s => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      factory(),
      snap => setState({ data: snap.docs.map(d => ({ id: d.id, ...d.data() }) as T), loading: false, error: null }),
      error => {
        console.error(`[useLiveQuery:${key}]`, error);
        setState({ data: [], loading: false, error });
      },
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export function useShops() {
  const res = useLiveQuery<Shop>(() => collection(db, 'shops'), 'shops');
  const shops = useMemo(
    () =>
      res.data
        .map(s => ({ ...s, closedHolidays: s.closedHolidays ?? [] }))
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'it')),
    [res.data],
  );
  return { ...res, data: shops };
}

export function useApprovedUsers(enabled = true) {
  const res = useLiveQuery<User>(
    enabled ? () => query(collection(db, 'users'), where('isApproved', '==', true)) : null,
    `users-approved-${enabled}`,
  );
  const users = useMemo(
    () => [...res.data].sort((a, b) => `${a.nome} ${a.cognome}`.localeCompare(`${b.nome} ${b.cognome}`, 'it')),
    [res.data],
  );
  return { ...res, data: users };
}

export function usePendingUsers(enabled = true) {
  return useLiveQuery<User>(
    enabled ? () => query(collection(db, 'users'), where('isApproved', '==', false)) : null,
    `users-pending-${enabled}`,
  );
}

/** Colleghi assegnati a un negozio (accessibile anche ai dipendenti) */
export function useShopMembers(shopId: string | null | undefined) {
  return useLiveQuery<User>(
    shopId ? () => query(collection(db, 'users'), where('shopIds', 'array-contains', shopId)) : null,
    `shop-members-${shopId}`,
  );
}
