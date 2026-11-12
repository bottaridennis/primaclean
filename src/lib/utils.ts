import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import type { Shop, User } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fullName = (u?: Pick<User, 'nome' | 'cognome'> | null) =>
  u ? `${u.nome ?? ''} ${u.cognome ?? ''}`.trim() || 'Senza nome' : 'Utente rimosso';

export const initials = (u?: Pick<User, 'nome' | 'cognome'> | null) =>
  u ? `${(u.nome || '?')[0] ?? ''}${(u.cognome || '')[0] ?? ''}`.toUpperCase() : '?';

/** Data locale in formato YYYY-MM-DD (evita gli slittamenti UTC di toISOString) */
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');
export const todayISO = () => toISODate(new Date());

/** Formattazione in italiano di una data ISO (YYYY-MM-DD) o di un Date */
export const fmt = (d: string | Date, pattern: string) =>
  format(typeof d === 'string' ? parseISO(d) : d, pattern, { locale: it });

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekLabel(days: Date[]) {
  const a = days[0];
  const b = days[6];
  if (a.getMonth() === b.getMonth()) return `${fmt(a, 'd')} – ${fmt(b, 'd MMMM yyyy')}`;
  if (a.getFullYear() === b.getFullYear()) return `${fmt(a, 'd MMM')} – ${fmt(b, 'd MMM yyyy')}`;
  return `${fmt(a, 'd MMM yyyy')} – ${fmt(b, 'd MMM yyyy')}`;
}

export const isShopClosed = (shop: Shop | undefined, isoDate: string) =>
  !!shop?.closedHolidays?.includes(isoDate);

/** Traduce i codici d'errore di Firebase in messaggi comprensibili */
export function firebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'L\'indirizzo email non è valido.',
    'auth/user-not-found': 'Email o password non corretti.',
    'auth/wrong-password': 'Email o password non corretti.',
    'auth/invalid-credential': 'Email o password non corretti.',
    'auth/invalid-login-credentials': 'Email o password non corretti.',
    'auth/email-already-in-use': 'Esiste già un account con questa email. Prova ad accedere.',
    'auth/weak-password': 'La password deve contenere almeno 6 caratteri.',
    'auth/too-many-requests': 'Troppi tentativi. Attendi qualche minuto e riprova.',
    'auth/network-request-failed': 'Connessione assente. Controlla la rete e riprova.',
    'auth/popup-closed-by-user': 'Accesso con Google annullato.',
    'auth/cancelled-popup-request': 'Accesso con Google annullato.',
    'auth/popup-blocked': 'Il browser ha bloccato la finestra di Google.',
    'auth/missing-password': 'Inserisci la password.',
    'auth/missing-email': 'Inserisci la tua email.',
    'permission-denied': 'Non hai i permessi per eseguire questa operazione.',
    unavailable: 'Servizio momentaneamente non raggiungibile. Riprova.',
  };
  return map[code] ?? 'Si è verificato un errore imprevisto. Riprova.';
}

/** Domenica di Pasqua (algoritmo di Meeus/Jones/Butcher) */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Festività nazionali italiane per l'anno indicato */
export function italianHolidays(year: number): { date: string; name: string }[] {
  const easter = easterSunday(year);
  const fixed: [string, string][] = [
    ['01-01', 'Capodanno'],
    ['01-06', 'Epifania'],
    ['04-25', 'Festa della Liberazione'],
    ['05-01', 'Festa dei Lavoratori'],
    ['06-02', 'Festa della Repubblica'],
    ['08-15', 'Ferragosto'],
    ['11-01', 'Ognissanti'],
    ['12-08', 'Immacolata Concezione'],
    ['12-25', 'Natale'],
    ['12-26', 'Santo Stefano'],
  ];
  return [
    ...fixed.map(([md, name]) => ({ date: `${year}-${md}`, name })),
    { date: toISODate(easter), name: 'Pasqua' },
    { date: toISODate(addDays(easter, 1)), name: 'Lunedì dell\'Angelo' },
  ].sort((x, y) => x.date.localeCompare(y.date));
}
