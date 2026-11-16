export type Role = 'admin' | 'employee';
export type ShiftType = 'morning' | 'afternoon' | 'full-day';

export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  role: Role;
  shopIds: string[];
  isApproved: boolean;
  isBlocked: boolean;
  canSeeColleagues: boolean;
  /** Ore settimanali da contratto (opzionale) */
  weeklyHours?: number;
}

export interface Shop {
  id: string;
  name: string;
  closedHolidays: string[]; // ISO dates YYYY-MM-DD
  /** Orari delle fasce per questo negozio (se assenti si usano quelli predefiniti) */
  shiftHours?: Partial<Record<ShiftType, ShiftHours>>;
}

export interface ShiftHours {
  start: string; // HH:mm
  end: string; // HH:mm
  /** Minuti di pausa non retribuita */
  breakMinutes?: number;
}

export interface Shift {
  id: string;
  userId: string;
  shopId: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
}

export interface ShiftExchange {
  id: string;
  requesterId: string;
  requesterShiftId: string;
  targetUserId: string;
  targetShiftId: string;
  shopId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ExchangeLog {
  id?: string;
  requesterId: string;
  requesterName: string;
  targetUserId: string;
  targetUserName: string;
  requesterShiftDate: string;
  requesterShiftType: string;
  targetShiftDate: string;
  targetShiftType: string;
  shopId: string;
  acceptedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  fromId: string;
  fromName: string;
  title: string;
  body: string;
  /** Sezione dell'app da aprire al click */
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  /** Categoria dell'azione */
  kind: 'shift' | 'shop' | 'user' | 'exchange';
  action: string;
  details?: string;
  shopId?: string;
  targetUserId?: string;
}
