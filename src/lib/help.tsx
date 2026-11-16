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
    id: 'staff-v2',
    intro: 'Tutto sul personale in un colpo d\'occhio: quanto lavora ognuno, dove e quando. Le persone appena registrate aspettano la tua approvazione.',
    steps: [
      { title: 'Scegli la settimana', text: 'Le frecce in alto cambiano la settimana di riferimento: ore e caselle colorate si aggiornano.' },
      { title: 'Leggi la riga', text: 'Le 7 caselle sono i giorni (M = Mattina, P = Pomeriggio, G = Giornata intera). La barra confronta le ore della settimana con quelle da contratto.' },
      { title: 'Trova chi è libero', text: 'Il filtro «Con ore libere» mostra chi può ancora lavorare questa settimana: utile per coprire un turno.' },
      { title: 'Controlla gli eccessi', text: '«Oltre contratto» mostra in rosso chi ha più ore del previsto.' },
      { title: 'Apri la scheda', text: 'Tocca una persona: vedi turni con orari, prossimi turni, ore del mese, attività recenti e i pulsanti per modificare, sospendere o eliminare.' },
      { title: 'Approva i nuovi', text: 'Nel filtro «In attesa» premi «Approva» e scegli il negozio. Prima di questo il dipendente non vede nulla.' },
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
  hours: {
    id: 'hours',
    intro: 'Qui vedi quante ore ha lavorato ogni persona nel mese, calcolate dai turni assegnati.',
    steps: [
      { title: 'Scegli mese e negozio', text: 'Usa le frecce per cambiare mese e il menu per vedere un solo negozio.' },
      { title: 'Leggi la tabella', text: 'Per ogni persona: turni, ore del mese e ore di ogni settimana. In fondo i totali.' },
      { title: 'Controlla gli avvisi', text: 'Le celle arancioni indicano le settimane oltre le ore da contratto (impostabili in Personale → Modifica).' },
      { title: 'Esporta', text: '«Esporta ore» e «Esporta turni» scaricano un file che si apre con Excel. «Stampa / PDF» crea una versione da stampare o salvare.' },
      { title: 'Orari corretti', text: 'Le ore dipendono dagli orari delle fasce: controllali in «Negozi e chiusure» → Orari dei turni.' },
    ],
  },
  activity: {
    id: 'activity',
    intro: 'Il diario di tutto ciò che succede nell\'app: chi ha fatto cosa e quando.',
    steps: [
      { title: 'Cosa viene registrato', text: 'Turni assegnati o tolti, settimane copiate, negozi e chiusure, approvazioni e modifiche del personale, scambi accettati.' },
      { title: 'Filtra', text: 'Scegli una categoria o scrivi un nome per trovare subito una modifica.' },
      { title: 'Solo lettura', text: 'Il registro non si può modificare: serve per controllare e risolvere dubbi.' },
    ],
  },
} satisfies Record<string, PageHelp>;

/** Porta l'utente a un'altra sezione dell'app */
export const goTo = (tab: string) => {
  window.location.hash = `/${tab}`;
};
