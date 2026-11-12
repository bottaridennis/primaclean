import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn, firebaseErrorMessage } from '../../lib/utils';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (messageOrError: unknown) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems(prev => prev.filter(t => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setItems(prev => [...prev.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: m => push('success', m),
      info: m => push('info', m),
      error: e => {
        if (typeof e === 'string') push('error', e);
        else {
          console.error(e);
          push('error', firebaseErrorMessage(e));
        }
      },
    }),
    [push],
  );

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tones = {
    success: 'text-emerald-600',
    error: 'text-rose-600',
    info: 'text-brand-600',
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="fixed z-[200] inset-x-0 bottom-24 md:bottom-auto md:top-6 flex flex-col items-center gap-2 px-4 pointer-events-none"
          aria-live="polite"
        >
          <AnimatePresence>
            {items.map(t => {
              const Icon = icons[t.tone];
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-brand-950 text-white pl-4 pr-2 py-2.5 shadow-lift max-w-md w-full sm:w-auto"
                  role={t.tone === 'error' ? 'alert' : 'status'}
                >
                  <Icon size={18} className={cn('shrink-0', tones[t.tone], 'brightness-150')} />
                  <p className="text-sm font-medium flex-1">{t.message}</p>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="size-8 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
                    aria-label="Chiudi notifica"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve essere usato dentro <ToastProvider>');
  return ctx;
}
