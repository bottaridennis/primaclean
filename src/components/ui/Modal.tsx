import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Impedisce la chiusura (es. durante un salvataggio) */
  locked?: boolean;
}

/**
 * Modale accessibile: bottom-sheet su mobile, dialog centrato su desktop.
 * Chiusura con ESC, click sullo sfondo o pulsante X.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', locked }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    // Focus iniziale sul primo elemento interattivo
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea, button:not([data-close])');
      el?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [open, locked, onClose]);

  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-brand-950/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !locked && onClose()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={cn(
              'relative w-full bg-white shadow-lift rounded-t-[28px] sm:rounded-3xl max-h-[92dvh] flex flex-col',
              widths[size],
            )}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
            {(title || description) && (
              <div className="flex items-start gap-4 px-6 pt-5 sm:pt-6">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 id={titleId} className="text-lg font-bold text-slate-900 leading-snug">
                      {title}
                    </h2>
                  )}
                  {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
                </div>
                <button
                  data-close
                  type="button"
                  onClick={onClose}
                  disabled={locked}
                  className="btn-icon -mr-2 -mt-1"
                  aria-label="Chiudi"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="px-6 py-5 overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-6 pb-6 pt-1 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pb-safe sm:pb-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
