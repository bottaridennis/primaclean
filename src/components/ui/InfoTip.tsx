import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Piccola icona (i) che apre una spiegazione al tocco/click.
 * Funziona anche su touch (niente hover) e si chiude con ESC o click esterno.
 */
export function InfoTip({ children, label = 'Cosa significa?', className, align = 'center', side = 'bottom' }: {
  children: ReactNode;
  label?: string;
  className?: string;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pos = { left: 'left-0', center: 'left-1/2 -translate-x-1/2', right: 'right-0' }[align];

  return (
    <span ref={ref} className={cn('relative inline-flex align-middle', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className={cn(
          'size-6 rounded-full inline-flex items-center justify-center transition-colors',
          open ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50',
        )}
      >
        <Info size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className={cn(
              side === 'top' ? 'absolute bottom-full mb-2 z-50' : 'absolute top-full mt-2 z-50',
              'w-64 max-w-[80vw] rounded-2xl bg-brand-950 text-white p-3.5 text-[13px] font-normal normal-case tracking-normal leading-relaxed text-left shadow-lift',
              pos,
            )}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
