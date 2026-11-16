import { useState } from 'react';
import { Download, Share, Smartphone, SquarePlus, WifiOff, X } from 'lucide-react';
import { useInstallApp, useOnline } from '../lib/pwa';
import { safeStorage } from '../lib/utils';

/** Riquadro "Installa l'app": usato nel profilo */
export function InstallCard() {
  const app = useInstallApp();
  if (app.installed) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-700">
        <Smartphone size={17} /> L'app è installata su questo dispositivo.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Aggiungi Prima Clean alla schermata Home: si apre come un'app, senza barra del browser, e i turni restano consultabili
        anche senza connessione.
      </p>
      {app.canPrompt ? (
        <button className="btn btn-primary" onClick={() => app.install()}>
          <Download size={17} /> Installa l'app
        </button>
      ) : app.ios ? (
        <IosSteps />
      ) : (
        <p className="text-[13px] text-slate-500">
          Dal menu del browser (⋮ in alto a destra) scegli <strong>«Installa app»</strong> o <strong>«Aggiungi a schermata Home»</strong>.
        </p>
      )}
    </div>
  );
}

function IosSteps() {
  return (
    <ol className="space-y-2 text-sm text-slate-600">
      <li className="flex items-center gap-2">
        <span className="size-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">1</span>
        Apri il sito con <strong>Safari</strong> e tocca <Share size={16} className="text-brand-600" /> <strong>Condividi</strong>
      </li>
      <li className="flex items-center gap-2">
        <span className="size-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">2</span>
        Scegli <SquarePlus size={16} className="text-brand-600" /> <strong>«Aggiungi alla schermata Home»</strong>
      </li>
      <li className="flex items-center gap-2">
        <span className="size-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">3</span>
        Conferma con <strong>«Aggiungi»</strong>
      </li>
    </ol>
  );
}

/** Banner discreto su mobile che propone l'installazione (una sola volta, si può chiudere) */
export function InstallBanner() {
  const app = useInstallApp();
  const [hidden, setHidden] = useState(() => safeStorage.get('pc-install-banner-hidden') === '1');
  if (hidden || app.installed || !(app.canPrompt || app.ios)) return null;
  const close = () => {
    safeStorage.set('pc-install-banner-hidden', '1');
    setHidden(true);
  };
  return (
    <div className="md:hidden print:hidden mb-5 flex items-center gap-3 rounded-2xl bg-brand-950 text-white p-3 pl-4">
      <Smartphone size={20} className="shrink-0 text-brand-200" />
      <p className="flex-1 text-sm">
        {app.ios ? 'Aggiungi l\'app alla Home: Condividi → «Aggiungi alla schermata Home».' : 'Installa l\'app sul telefono per aprirla con un tocco.'}
      </p>
      {app.canPrompt && (
        <button className="btn btn-sm bg-white text-brand-900 hover:bg-brand-50" onClick={() => app.install().then(ok => ok && close())}>
          Installa
        </button>
      )}
      <button className="size-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white" onClick={close} aria-label="Chiudi">
        <X size={16} />
      </button>
    </div>
  );
}

/** Avviso quando il dispositivo è offline */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="print:hidden mb-5 flex items-center gap-3 rounded-2xl bg-amber-100 border border-amber-200 px-4 py-3 text-sm text-amber-900" role="status">
      <WifiOff size={18} className="shrink-0" />
      <span>
        <strong>Sei offline.</strong> Vedi gli ultimi dati salvati; le modifiche verranno inviate appena torna la connessione.
      </span>
    </div>
  );
}
