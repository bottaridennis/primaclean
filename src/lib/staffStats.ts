import { addDays, addWeeks } from 'date-fns';
import type { Shift, Shop, User } from '../types';
import { shiftDuration, sortShifts } from './shifts';
import { toISODate } from './utils';

export type HoursStatus = 'over' | 'under' | 'full' | 'none';

export interface StaffStats {
  weekShifts: Shift[];
  /** Turni per ciascun giorno della settimana selezionata (indice 0 = lunedì) */
  byDay: Shift[][];
  weekHours: number;
  contract: number | null;
  /** Ore da contratto ancora disponibili (negativo = oltre il contratto) */
  remaining: number | null;
  status: HoursStatus;
  monthHours: number;
  monthShifts: number;
  /** Media settimanale delle 4 settimane precedenti */
  avg4: number;
  upcoming: Shift[];
  next?: Shift;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function computeStaffStats(
  user: Pick<User, 'id' | 'weeklyHours'>,
  shifts: Shift[],
  shopsById: Record<string, Shop>,
  week: Date[],
  monthRange: [string, string],
  today: string,
): StaffStats {
  const mine = shifts.filter(s => s.userId === user.id);
  const hours = (list: Shift[]) => round(list.reduce((t, s) => t + shiftDuration(shopsById[s.shopId], s.shiftType), 0));
  const iso = week.map(toISODate);
  const weekShifts = sortShifts(mine.filter(s => s.date >= iso[0] && s.date <= iso[6])).sort((a, b) => a.date.localeCompare(b.date));
  const byDay = iso.map(d => sortShifts(weekShifts.filter(s => s.date === d)));
  const weekHours = hours(weekShifts);
  const contract = user.weeklyHours ? Number(user.weeklyHours) : null;
  const remaining = contract !== null ? round(contract - weekHours) : null;
  const status: HoursStatus = contract === null ? 'none' : weekHours > contract + 0.001 ? 'over' : weekHours < contract - 0.001 ? 'under' : 'full';

  const inMonth = mine.filter(s => s.date >= monthRange[0] && s.date <= monthRange[1]);
  const prevWeeks = [1, 2, 3, 4].map(n => {
    const start = addWeeks(week[0], -n);
    const a = toISODate(start);
    const b = toISODate(addDays(start, 6));
    return hours(mine.filter(s => s.date >= a && s.date <= b));
  });
  const upcoming = mine.filter(s => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  return {
    weekShifts,
    byDay,
    weekHours,
    contract,
    remaining,
    status,
    monthHours: hours(inMonth),
    monthShifts: inMonth.length,
    avg4: round(prevWeeks.reduce((t, h) => t + h, 0) / 4),
    upcoming: upcoming.slice(0, 6),
    next: upcoming[0],
  };
}
