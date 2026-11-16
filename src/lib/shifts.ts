import { Sunrise, Sunset, Sun, type LucideIcon } from 'lucide-react';
import type { Shift, ShiftHours, ShiftType, Shop } from '../types';

export interface ShiftMeta {
  type: ShiftType;
  label: string;
  short: string;
  icon: LucideIcon;
  /** Pill piena (es. turno dell'utente) */
  solid: string;
  /** Pill morbida (es. turno di un collega) */
  soft: string;
  dot: string;
  order: number;
}

export const SHIFT_TYPES: Record<ShiftType, ShiftMeta> = {
  morning: {
    type: 'morning',
    label: 'Mattina',
    short: 'M',
    icon: Sunrise,
    solid: 'bg-amber-500 text-white',
    soft: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    order: 1,
  },
  afternoon: {
    type: 'afternoon',
    label: 'Pomeriggio',
    short: 'P',
    icon: Sunset,
    solid: 'bg-violet-500 text-white',
    soft: 'bg-violet-50 text-violet-800 border-violet-200',
    dot: 'bg-violet-500',
    order: 2,
  },
  'full-day': {
    type: 'full-day',
    label: 'Giornata intera',
    short: 'G',
    icon: Sun,
    solid: 'bg-brand-600 text-white',
    soft: 'bg-brand-50 text-brand-800 border-brand-200',
    dot: 'bg-brand-600',
    order: 0,
  },
};

export const SHIFT_TYPE_LIST: ShiftMeta[] = [SHIFT_TYPES.morning, SHIFT_TYPES.afternoon, SHIFT_TYPES['full-day']];

export function shiftMeta(type: string | undefined): ShiftMeta {
  return SHIFT_TYPES[(type as ShiftType) ?? 'full-day'] ?? SHIFT_TYPES['full-day'];
}

export function sortShifts<T extends Pick<Shift, 'shiftType'>>(shifts: T[]): T[] {
  return [...shifts].sort((a, b) => shiftMeta(a.shiftType).order - shiftMeta(b.shiftType).order);
}

/**
 * Verifica se un nuovo turno è in conflitto con quelli già presenti
 * per lo stesso dipendente nello stesso giorno (in qualsiasi negozio).
 * Ritorna un messaggio d'errore oppure null.
 */
export function shiftConflict(existing: Pick<Shift, 'shiftType'>[], type: ShiftType): string | null {
  if (existing.length === 0) return null;
  if (existing.some(s => s.shiftType === type)) return 'Turno già assegnato in questa fascia.';
  if (type === 'full-day') return 'Il dipendente ha già un turno in questa giornata.';
  if (existing.some(s => s.shiftType === 'full-day')) return 'Il dipendente lavora già l\'intera giornata.';
  return null;
}

/** Orari predefiniti, modificabili per ogni negozio in «Negozi e chiusure» */
export const DEFAULT_SHIFT_HOURS: Record<ShiftType, ShiftHours> = {
  morning: { start: '08:30', end: '13:00' },
  afternoon: { start: '15:00', end: '19:30' },
  'full-day': { start: '08:30', end: '19:30', breakMinutes: 120 },
};

export function hoursFor(shop: Pick<Shop, 'shiftHours'> | undefined, type: ShiftType | string): ShiftHours {
  const t = (type as ShiftType) in DEFAULT_SHIFT_HOURS ? (type as ShiftType) : 'full-day';
  return { ...DEFAULT_SHIFT_HOURS[t], ...(shop?.shiftHours?.[t] ?? {}) };
}

const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Durata in ore (decimali) di un turno, tolta la pausa */
export function shiftDuration(shop: Pick<Shop, 'shiftHours'> | undefined, type: ShiftType | string): number {
  const h = hoursFor(shop, type);
  let mins = toMin(h.end) - toMin(h.start);
  if (mins < 0) mins += 24 * 60;
  return Math.max(0, mins - (h.breakMinutes ?? 0)) / 60;
}

export const timeRange = (shop: Pick<Shop, 'shiftHours'> | undefined, type: ShiftType | string) => {
  const h = hoursFor(shop, type);
  return `${h.start}–${h.end}`;
};

/** 7.5 → "7,5 h"; 8 → "8 h" */
export const formatHours = (n: number) =>
  `${Number.isInteger(n) ? n : n.toLocaleString('it-IT', { maximumFractionDigits: 2 })} h`;
