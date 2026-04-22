export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  role: 'admin' | 'employee';
  shopIds: string[];
  isApproved: boolean;
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
