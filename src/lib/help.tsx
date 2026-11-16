import type { PageHelp } from '../components/ui/Primitives';

/** Spiegazioni "Come funziona" mostrate in cima a ogni pagina */
export const HELP = {
  planner: {
    id: 'planner',
    intro: 'Qui decidi chi lavora, dove e quando. Ogni modifica è visibile subito ai dipendenti.',
    steps: [
      { title: 'Scegli il negozio', text: 'Tocca il nome del negozio nei pulsanti in alto. Vedrai solo le persone assegnate a quel negozio.' },
      { title: 'Scegli la settimana', text: 'Usa le frecce ‹ › accanto alle date. «Oggi» ti riporta alla settimana corrente.' },
      { title: 'Tocca una casella', text: 'Riga = persona, colonna = giorno. Tocca la casella con il «+» e scegli Mattina, Pomeriggio o Giornata intera.' },
      { title: 'Per togliere un turno', text: 'Tocca la casella colorata e premi il turno con la scritta «Rimuovi».' },
      { title: 'Controlla la copertura', text: 'L\'ultima riga conta quante persone ci sono al mattino (M) e al pomeriggio (P). «Scoperto» = nessuno in turno.' },
      { title: 'Risparmia tempo', text: '«Copia settimana precedente» ricopia i turni della settimana prima, saltando chiusure e conflitti.' },
    ],
  },
  scheduleAdmin: {
    id: 'schedule-admin',
    intro: 'La settimana di ogni negozio, così come la vedono i dipendenti. Qui si guarda soltanto: i turni si modificano dal Planner.',
    steps: [
      { title: 'Scegli negozio e settimana', text: 'Pulsanti in alto per il negozio, frecce ‹ › per la settimana.' },
      { title: 'Leggi i colori', text: 'Arancione = Mattina, Viola = Pomeriggio, Verde acqua = Giornata intera. Righe rosse = negozio chiuso.' },
      { title: 'Proposte di scambio', text: 'Se anche tu sei in turno, in alto compaiono le proposte di scambio che ti riguardano.' },
    ],
  },
  scheduleEmployee: {
    id: 'schedule-employee',
    intro: 'Qui trovi tutti i tuoi turni. Non devi fare niente: si aggiorna da sola quando il responsabile cambia qualcosa.',
    steps: [
      { title: 'Il prossimo turno', text: 'Il riquadro colorato in alto ti dice quando e dove lavori la prossima volta.' },
      { title: 'La settimana', text: 'Sotto ci sono tutti i giorni. I turni pieni di colore sono i tuoi, quelli chiari sono dei colleghi.' },
      { title: 'Cambia settimana', text: 'Usa le frecce ‹ › per vedere la settimana prima o dopo, «Oggi» per tornare a questa.' },
      { title: 'Scambia un turno', text: 'Premi «Scambia» sotto un tuo turno, scegli il turno del collega e invia. Resta tuo finché lui non accetta.' },
      { title: 'Rispondi alle proposte', text: 'Se un collega ti propone uno scambio, compare un riquadro in alto con «Accetta» e «Rifiuta».' },
    ],
  },
  staff: {
    id: 'staff',
    intro: 'L\'elenco di chi usa l\'app. Le persone appena registrate aspettano la tua approvazione.',
    steps: [
      { title: 'Approva i nuovi', text: 'Apri il filtro «In attesa», premi «Approva» e scegli almeno un negozio. Prima di questo il dipendente non vede nulla.' },
      { title: 'Modifica', text: '«Modifica» cambia nome, negozi assegnati e la possibilità di vedere i turni dei colleghi.' },
      { title: 'Sospendi', text: 'Blocca subito l\'accesso (es. fine contratto) senza cancellare niente. Si può riattivare in ogni momento.' },
      { title: 'Elimina', text: 'Cancella definitivamente il profilo e i suoi turni futuri. Usalo solo se sei sicuro.' },
      { title: 'Rendi admin', text: 'Dà a quella persona gli stessi poteri che hai tu. Da usare solo per i responsabili.' },
    ],
  },
  shops: {
    id: 'shops',
    intro: 'I tuoi punti vendita. Ogni dipendente e ogni turno appartiene a un negozio.',
    steps: [
      { title: 'Aggiungi un negozio', text: 'Scrivi il nome nel campo in alto e premi «Aggiungi negozio».' },
      { title: 'Segna le chiusure', text: 'Nel riquadro del negozio scegli una data e premi «Aggiungi». In quel giorno non si potranno assegnare turni.' },
      { title: 'Festività in un clic', text: '«Festività nazionali» aggiunge Natale, Pasqua, Ferragosto e tutte le altre feste di quest\'anno e del prossimo.' },
      { title: 'Rinomina o elimina', text: 'Matita = cambia nome. Cestino = elimina il negozio e tutti i suoi turni (attenzione!).' },
    ],
  },
  exchanges: {
    id: 'exchanges',
    intro: 'Il registro di tutti gli scambi di turno accettati tra colleghi. Serve per controllare chi ha cambiato cosa.',
    steps: [
      { title: 'Come leggerlo', text: 'Ogni riga mostra le due persone e il turno che ognuna ha ceduto all\'altra.' },
      { title: 'Cerca', text: 'Scrivi un nome o scegli un negozio per filtrare l\'elenco.' },
      { title: 'Non serve fare nulla', text: 'Gli scambi si registrano da soli quando un dipendente ne accetta uno.' },
    ],
  },
} satisfies Record<string, PageHelp>;

/** Porta l'utente a un'altra sezione dell'app */
export const goTo = (tab: string) => {
  window.location.hash = `/${tab}`;
};
