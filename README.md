# Prima Clean · Gestione turni

Web app per la gestione dei turni del personale di una catena di lavanderie / lavasecco.
React 19 + Vite + Tailwind CSS 4, con Firebase (Auth + Firestore) come backend.

## Funzionalità

**Amministratori**
- **Panoramica**: chi è in servizio oggi in ogni negozio, giorni scoperti nei prossimi 7 giorni, richieste di accesso, ultimi scambi.
- **Planner turni**: griglia settimanale personale × giorni; un tocco per assegnare/rimuovere Mattina, Pomeriggio o Giornata intera. Blocca conflitti (anche tra sedi diverse) e giorni di chiusura, mostra la copertura giornaliera e permette di copiare la settimana precedente.
- **Agenda negozi**: vista settimanale di ogni punto vendita con navigazione tra le settimane.
- **Personale**: ricerca e filtri, approvazione/rifiuto delle registrazioni, assegnazione negozi, visibilità turni colleghi, sospensione, promozione ad admin, eliminazione (con pulizia dei turni futuri).
- **Negozi e chiusure**: creazione, rinomina, eliminazione, giorni di chiusura e inserimento rapido delle festività nazionali italiane.
- **Storico scambi** con filtri per nome e negozio.
- **Ore e presenze**: ore lavorate per persona e per settimana (dagli orari delle fasce di ogni negozio), avviso oltre le ore da contratto, esportazione CSV per Excel e stampa/PDF.
- **Registro attività**: chi ha modificato turni, negozi e personale, e quando.
- **Stampa settimana** dal Planner, da appendere in negozio o salvare in PDF.

**Dipendenti**
- Prossimo turno in evidenza e agenda settimanale.
- Proposta di scambio turno ai colleghi (solo turni futuri e compatibili), accettazione/rifiuto con verifica che i turni non siano cambiati nel frattempo.
- Profilo con negozi assegnati, turni e ore del mese, cambio password.

**Per tutti**
- **Notifiche** in-app (campanella) per turni nuovi o annullati e scambi; notifiche di sistema mentre l'app è aperta o in background.
- **App installabile** (PWA) e consultabile **offline** grazie a service worker e cache locale di Firestore.
- Tutorial iniziale, guida con domande frequenti e spiegazioni in ogni pagina.

> Le notifiche push con l'app completamente chiusa richiedono una Cloud Function che invii messaggi FCM
> alla creazione di un documento in `notifications` (non inclusa).

## Avvio in locale

1. `npm install`
2. Copia `.env.example` in `.env.local` e compila le variabili `VITE_FIREBASE_*`
   (in alternativa crea `firebase-applet-config.json` nella root).
3. `npm run dev` → http://localhost:3000

Comandi utili: `npm run lint` (type-check), `npm run build`.

## Regole Firestore

`firestore.rules` è escluso da git. In `firestore.rules.example` trovi un set di regole
compatibile con l'app da usare come punto di partenza.

## Deploy

Il workflow GitHub Actions (`.github/workflows/main.yml`) esegue type-check e build e pubblica
`dist/` su GitHub Pages a ogni push su `main`.
