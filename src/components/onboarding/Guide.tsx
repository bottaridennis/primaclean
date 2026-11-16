import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  Bell,
  Clock,
  Check,
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  PartyPopper,
  PlayCircle,
  RotateCcw,
  Store,
  Sunrise,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn, safeStorage } from '../../lib/utils';
import { SHIFT_TYPE_LIST } from '../../lib/shifts';
import type { User } from '../../types';
import type { TabId } from '../Layout';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

/* ------------------------------------------------------------------ */
/* Contenuti                                                            */
/* ------------------------------------------------------------------ */

interface TourStep {
  tab?: TabId;
  icon: LucideIcon;
  title: string;
  body: ReactNode;
}

const ShiftLegend = () => (
  <span className="mt-3 flex flex-wrap gap-2">
    {SHIFT_TYPE_LIST.map(m => (
      <span key={m.type} className={cn('chip border', m.soft)}>
        <m.icon size={13} /> {m.label}
      </span>
    ))}
  </span>
);

function adminSteps(): TourStep[] {
  return [
    {
      tab: 'dashboard',
      icon: LayoutDashboard,
      title: 'Benvenuto in Prima Clean!',
      body: (
        <>
          Questa è la <strong>Panoramica</strong>: ogni mattina ti dice chi lavora oggi in ogni negozio, quali giorni sono rimasti
          senza personale e chi ha chiesto di accedere all'app. Ti mostro le sezioni in un minuto.
        </>
      ),
    },
    {
      tab: 'shops',
      icon: Store,
      title: '1. Crea i tuoi negozi',
      body: (
        <>
          In <strong>Negozi e chiusure</strong> aggiungi ogni punto vendita. Per ognuno puoi segnare i giorni di chiusura (ferie,
          festività): in quei giorni nessuno potrà essere messo in turno. Il pulsante «Festività nazionali» le inserisce tutte in un
          colpo.
        </>
      ),
    },
    {
      tab: 'staff',
      icon: Users,
      title: '2. Approva il personale',
      body: (
        <>
          I dipendenti si registrano da soli dalla pagina di accesso. Li trovi in <strong>Personale</strong> sotto «In attesa»:
          premi <strong>Approva</strong> e scegli in quale negozio lavorano. Finché non li approvi non vedono nulla.
        </>
      ),
    },
    {
      tab: 'planner',
      icon: CalendarRange,
      title: '3. Pianifica i turni',
      body: (
        <>
          Nel <strong>Planner turni</strong> ogni riga è una persona e ogni colonna un giorno. Tocca una casella vuota e scegli la
          fascia: è tutto. L'ultima riga «Copertura» ti avvisa se un giorno resta scoperto.
          <ShiftLegend />
        </>
      ),
    },
    {
      tab: 'schedule',
      icon: CalendarDays,
      title: '4. Controlla l\'agenda',
      body: (
        <>
          L'<strong>Agenda negozi</strong> mostra la settimana come la vedono i dipendenti. Usa le frecce ‹ › per cambiare
          settimana e «Oggi» per tornare a quella corrente.
        </>
      ),
    },
    {
      tab: 'exchanges',
      icon: ArrowLeftRight,
      title: '5. Scambi tra colleghi',
      body: (
        <>
          I dipendenti possono scambiarsi i turni tra loro: uno propone, l'altro accetta. Non devi fare nulla, ma ogni scambio
          accettato resta registrato in <strong>Storico scambi</strong>.
        </>
      ),
    },
    {
      tab: 'hours',
      icon: Clock,
      title: '6. Ore, esportazioni e registro',
      body: (
        <>
          In <strong>Ore e presenze</strong> vedi le ore di ognuno con l'avviso se supera il contratto, e puoi esportare in Excel o
          stampare. Nel <strong>Registro attività</strong> trovi chi ha cambiato cosa. La <strong>campanella</strong> in alto ti
          avvisa delle novità.
        </>
      ),
    },
    {
      icon: PartyPopper,
      title: 'Tutto pronto!',
      body: (
        <>
          In ogni pagina trovi il pulsante <strong>«Come funziona»</strong> con le istruzioni passo passo, e le icone{' '}
          <strong>(i)</strong> spiegano le parole meno chiare. Puoi rivedere questo tutorial quando vuoi dal pulsante{' '}
          <strong>Guida</strong>.
        </>
      ),
    },
  ];
}

function employeeSteps(user: User): TourStep[] {
  return [
    {
      tab: 'schedule',
      icon: LayoutDashboard,
      title: `Ciao ${user.nome}, benvenuto!`,
      body: (
        <>
          Con quest'app vedi sempre <strong>quando lavori</strong> e <strong>in quale negozio</strong>, anche dal telefono. Ti
          mostro come funziona in pochi passaggi.
        </>
      ),
    },
    {
      tab: 'schedule',
      icon: Sunrise,
      title: 'Il tuo prossimo turno',
      body: (
        <>
          Il riquadro colorato in alto ti dice subito <strong>quando è il tuo prossimo turno</strong>. I colori indicano la fascia
          oraria:
          <ShiftLegend />
        </>
      ),
    },
    {
      tab: 'schedule',
      icon: CalendarDays,
      title: 'La tua settimana',
      body: (
        <>
          Sotto trovi tutti i giorni della settimana. I turni <strong>pieni di colore</strong> sono i tuoi. Usa le frecce ‹ › per
          vedere la settimana prima o dopo. I giorni a righe rosse sono di <strong>chiusura</strong>.
        </>
      ),
    },
    user.canSeeColleagues
      ? {
          tab: 'schedule',
          icon: ArrowLeftRight,
          title: 'Scambiare un turno',
          body: (
            <>
              Non puoi venire? Sotto ogni tuo turno c'è il pulsante <strong>«Scambia»</strong>: scegli il turno di un collega da
              prendere al posto del tuo. Il collega riceverà la proposta e deciderà se accettare. Finché non accetta, il turno
              resta tuo.
            </>
          ),
        }
      : {
          tab: 'schedule',
          icon: ArrowLeftRight,
          title: 'Scambiare un turno',
          body: (
            <>
              Per ora vedi solo i tuoi turni. Se vuoi poter scambiare i turni con i colleghi, chiedi al responsabile di abilitare
              la «visibilità dei turni dei colleghi».
            </>
          ),
        },
    {
      tab: 'schedule',
      icon: Check,
      title: 'Quando un collega ti chiede uno scambio',
      body: (
        <>
          In cima alla pagina comparirà un riquadro con la proposta: vedi cosa <strong>cedi</strong> e cosa <strong>ricevi</strong>.
          Premi <strong>Accetta</strong> o <strong>Rifiuta</strong>. Se accetti, l'agenda si aggiorna da sola.
        </>
      ),
    },
    {
      tab: 'schedule',
      icon: Bell,
      title: 'Le notifiche',
      body: (
        <>
          Quando ti assegnano o tolgono un turno, o un collega ti scrive per uno scambio, la <strong>campanella</strong> in alto
          mostra un numero rosso. Toccala per leggere, e premi «Attiva notifiche» per ricevere gli avvisi sul telefono.
        </>
      ),
    },
    {
      tab: 'profile',
      icon: KeyRound,
      title: 'Il tuo profilo',
      body: (
        <>
          Nel <strong>Profilo</strong> vedi i negozi a cui sei assegnato, le ore del mese, puoi cambiare la password e{' '}
          <strong>installare l'app sul telefono</strong>.
        </>
      ),
    },
    {
      icon: PartyPopper,
      title: 'Fatto!',
      body: (
        <>
          Se hai un dubbio premi il pulsante <strong>Guida</strong> (il salvagente in alto): trovi le risposte alle domande più
          comuni e puoi rivedere questo tutorial.
        </>
      ),
    },
  ];
}

interface Faq {
  q: string;
  a: ReactNode;
}

const ADMIN_FAQ: Faq[] = [
  { q: 'Un dipendente si è registrato ma non vede niente', a: 'Deve essere approvato: vai in Personale → «In attesa», premi Approva e scegli almeno un negozio.' },
  { q: 'Come assegno un turno?', a: 'Planner turni → scegli il negozio in alto → tocca la casella della persona nel giorno giusto → scegli Mattina, Pomeriggio o Giornata intera.' },
  { q: 'Come tolgo o cambio un turno?', a: 'Nel Planner tocca la casella con il turno: il turno già assegnato ha la scritta «Rimuovi». Per cambiarlo rimuovilo e assegna quello nuovo.' },
  { q: 'Perché non riesco ad assegnare un turno?', a: 'Succede se il negozio è chiuso quel giorno, o se la persona ha già un turno sovrapposto (anche in un altro negozio). Sotto il pulsante è scritto il motivo.' },
  { q: 'Come faccio a non rifare ogni settimana da zero?', a: 'Nel Planner premi «Copia settimana precedente»: i turni della settimana prima vengono ricopiati, saltando chiusure e conflitti.' },
  { q: 'Come segno un giorno di chiusura?', a: 'Negozi e chiusure → nel riquadro del negozio scegli la data e premi Aggiungi. «Festività nazionali» aggiunge tutte le feste italiane.' },
  { q: 'Cosa significa «Vede colleghi»?', a: 'Il dipendente può vedere i turni di tutti i colleghi del negozio e proporre scambi. Se è disattivato vede solo i propri turni. Si cambia da Personale → Modifica.' },
  { q: 'Come controllo le ore lavorate?', a: 'Ore e presenze → scegli il mese. Le settimane oltre il contratto sono in arancione. Da lì puoi esportare in Excel o stampare.' },
  { q: 'Chi ha cambiato questo turno?', a: 'Registro attività: ogni modifica a turni, negozi e personale è annotata con autore, data e ora.' },
  { q: 'Come stampo i turni da appendere in negozio?', a: 'Planner turni → scegli negozio e settimana → «Stampa settimana». Dalla finestra di stampa puoi anche salvare in PDF.' },
  { q: 'Un dipendente non lavora più con noi', a: 'Personale → «Sospendi» blocca subito l\'accesso mantenendo lo storico; «Elimina» cancella il profilo e i suoi turni futuri.' },
];

const COMMON_FAQ: Faq[] = [
  { q: 'Come metto l\'app sul telefono?', a: 'Vai nel Profilo → «App sul telefono» e segui le istruzioni. Su iPhone: Safari → Condividi → «Aggiungi alla schermata Home».' },
  { q: 'Come ricevo gli avvisi?', a: 'Tocca la campanella in alto: lì trovi tutte le notifiche. Premi «Attiva notifiche» per ricevere gli avvisi anche quando l\'app è in background.' },
  { q: 'Funziona senza internet?', a: 'Sì, puoi consultare gli ultimi turni caricati. Le modifiche fatte offline vengono inviate appena torna la connessione.' },
];

const EMPLOYEE_FAQ: Faq[] = [
  { q: 'Non vedo nessun turno', a: 'Il responsabile non ti ha ancora messo in turno per questa settimana. Prova la settimana successiva con la freccia ›.' },
  { q: 'Cosa significano i colori?', a: 'Arancione = Mattina, Viola = Pomeriggio, Verde acqua = Giornata intera. I turni pieni di colore sono i tuoi, quelli chiari sono dei colleghi.' },
  { q: 'Come scambio un turno con un collega?', a: 'Sotto il tuo turno premi «Scambia», scegli il turno del collega e premi «Invia proposta». Il turno resta tuo finché lui non accetta.' },
  { q: 'Non vedo il pulsante «Scambia»', a: 'Compare solo sui tuoi turni futuri e solo se il responsabile ti ha abilitato a vedere i turni dei colleghi.' },
  { q: 'Ho sbagliato a proporre uno scambio', a: 'In cima all\'agenda trovi la proposta in attesa: premi «Annulla proposta».' },
  { q: 'Ho dimenticato la password', a: 'Nella pagina di accesso premi «Password dimenticata?» e segui il link che ricevi via email.' },
  { q: 'Lavoro in più negozi', a: 'In alto nell\'agenda trovi un pulsante per ogni negozio: tocca quello che vuoi vedere.' },
];

/* ------------------------------------------------------------------ */
/* Contesto                                                             */
/* ------------------------------------------------------------------ */

interface GuideApi {
  startTour: () => void;
  openHelp: () => void;
}

const GuideContext = createContext<GuideApi>({ startTour: () => {}, openHelp: () => {} });
export const useGuide = () => useContext(GuideContext);

const tourKey = (uid: string) => `pc-tour-done-${uid}-v1`;

export function GuideProvider({ user, onNavigate, children }: { user: User; onNavigate: (t: TabId) => void; children: ReactNode }) {
  const [step, setStep] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const steps = user.role === 'admin' ? adminSteps() : employeeSteps(user);

  // Primo accesso: avvia il tutorial automaticamente
  useEffect(() => {
    if (safeStorage.get(tourKey(user.id)) !== '1') {
      const t = setTimeout(() => setStep(0), 700);
      return () => clearTimeout(t);
    }
  }, [user.id]);

  useEffect(() => {
    if (step === null) return;
    const tab = steps[step]?.tab;
    if (tab) onNavigate(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = () => {
    safeStorage.set(tourKey(user.id), '1');
    setStep(null);
  };

  const api: GuideApi = {
    startTour: () => {
      setHelpOpen(false);
      setStep(0);
    },
    openHelp: () => setHelpOpen(true),
  };

  return (
    <GuideContext.Provider value={api}>
      {children}
      <TourCard steps={steps} step={step} onStep={setStep} onFinish={finish} />
      <HelpCenter open={helpOpen} onClose={() => setHelpOpen(false)} user={user} onStartTour={api.startTour} />
    </GuideContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Tutorial                                                             */
/* ------------------------------------------------------------------ */

function TourCard({ steps, step, onStep, onFinish }: { steps: TourStep[]; step: number | null; onStep: (n: number) => void; onFinish: () => void }) {
  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish();
      if (e.key === 'ArrowRight') step < steps.length - 1 ? onStep(step + 1) : onFinish();
      if (e.key === 'ArrowLeft' && step > 0) onStep(step - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, steps.length, onStep, onFinish]);

  const current = step !== null ? steps[step] : null;
  const last = step === steps.length - 1;

  return (
    <AnimatePresence>
      {current && step !== null && (
        <div className="fixed inset-0 z-[150] pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-brand-950/25 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="pointer-events-auto absolute inset-x-3 bottom-3 md:inset-x-auto md:right-8 md:bottom-8 md:w-[440px] rounded-[28px] bg-white shadow-lift border border-slate-200 overflow-hidden"
          >
            <div className="h-1.5 bg-slate-100">
              <motion.div className="h-full bg-brand-500" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={step}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="size-12 shrink-0 rounded-2xl bg-brand-600 text-white flex items-center justify-center"
                  >
                    <current.icon size={24} />
                  </motion.span>
                </AnimatePresence>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-brand-600">
                    Passo {step + 1} di {steps.length}
                  </p>
                  <h2 className="text-lg font-extrabold text-brand-950 leading-snug">{current.title}</h2>
                </div>
                <button className="btn-icon -mr-2 -mt-2" onClick={onFinish} aria-label="Chiudi tutorial">
                  <X size={18} />
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                  className="mt-4 text-[15px] text-slate-600 leading-relaxed"
                >
                  {current.body}
                </motion.div>
              </AnimatePresence>
              <div className="mt-6 flex items-center gap-2">
                {step === 0 ? (
                  <button className="btn btn-ghost" onClick={onFinish}>
                    Salta
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={() => onStep(step - 1)}>
                    <ArrowLeft size={17} /> Indietro
                  </button>
                )}
                <div className="flex-1 flex justify-center gap-1.5" aria-hidden="true">
                  {steps.map((_, i) => (
                    <span key={i} className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-5 bg-brand-600' : 'w-1.5 bg-slate-200')} />
                  ))}
                </div>
                <button className="btn btn-primary" onClick={() => (last ? onFinish() : onStep(step + 1))} data-autofocus>
                  {last ? (
                    <>
                      Inizia <Check size={17} />
                    </>
                  ) : (
                    <>
                      Avanti <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Centro assistenza                                                    */
/* ------------------------------------------------------------------ */

function HelpCenter({ open, onClose, user, onStartTour }: { open: boolean; onClose: () => void; user: User; onStartTour: () => void }) {
  const toast = useToast();
  const faq = [...(user.role === 'admin' ? ADMIN_FAQ : EMPLOYEE_FAQ), ...COMMON_FAQ];
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const resetPageHelp = () => {
    try {
      Object.keys(window.localStorage)
        .filter(k => k.startsWith('pc-help-hidden-'))
        .forEach(k => safeStorage.remove(k));
    } catch {
      /* ignorato */
    }
    window.dispatchEvent(new CustomEvent('pc-help-reset'));
    toast.success('Le spiegazioni «Come funziona» saranno di nuovo visibili in ogni pagina.');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Guida" description="Le risposte alle domande più frequenti." size="lg">
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={onStartTour} className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-left hover:bg-brand-100 transition-colors">
            <span className="size-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
              <PlayCircle size={20} />
            </span>
            <span>
              <span className="block font-bold text-brand-900">Rivedi il tutorial</span>
              <span className="block text-[13px] text-brand-800/80">Il giro guidato di un minuto</span>
            </span>
          </button>
          <button onClick={resetPageHelp} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50 transition-colors">
            <span className="size-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <RotateCcw size={20} />
            </span>
            <span>
              <span className="block font-bold text-slate-800">Mostra le spiegazioni</span>
              <span className="block text-[13px] text-slate-500">Riapre «Come funziona» in ogni pagina</span>
            </span>
          </button>
        </div>

        <div>
          <p className="eyebrow mb-2">Domande frequenti</p>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {faq.map((f, i) => {
              const isOpen = openIdx === i;
              return (
                <li key={f.q}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left font-semibold text-slate-800 hover:bg-slate-50"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="flex-1">{f.q}</span>
                    <ChevronDown size={18} className={cn('text-slate-400 transition-transform shrink-0', isOpen && 'rotate-180')} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="px-4 pb-4 text-[15px] text-slate-600 leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="flex items-center gap-2 text-[13px] text-slate-500">
          <LifeBuoy size={15} /> Non trovi la risposta? {user.role === 'admin' ? 'Contatta chi gestisce l\'app.' : 'Chiedi al responsabile del tuo negozio.'}
        </p>
      </div>
    </Modal>
  );
}

export function GuideButton({ variant = 'sidebar' }: { variant?: 'sidebar' | 'icon' }) {
  const { openHelp } = useGuide();
  if (variant === 'icon') {
    return (
      <button onClick={openHelp} className="btn-icon text-brand-700" aria-label="Guida e domande frequenti">
        <LifeBuoy size={21} />
      </button>
    );
  }
  return (
    <button
      onClick={openHelp}
      className="w-full flex items-center gap-3 px-3 h-12 rounded-2xl text-[15px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
    >
      <LifeBuoy size={20} /> <span className="flex-1 text-left">Guida e domande</span>
    </button>
  );
}

