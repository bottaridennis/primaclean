export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  role: 'admin' | 'employee';
  shopIds: string[];
  isApproved: boolean;
  isBlocked: boolean;
  canSeeColleagues: boolean;
}

export interface Shop {
  id: string;
  name: string;
  closedHolidays: string[]; // ISO dates YYYY-MM-DD
}

export interface Shift {
  id: string;
  userId: string;
  shopId: string;
  date: string; // YYYY-MM-DD
  shiftType: 'morning' | 'afternoon' | 'full-day';
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

