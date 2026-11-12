import { Sunrise, Sunset, Sun, type LucideIcon } from 'lucide-react';
import type { Shift, ShiftType } from '../types';

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
