import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Lightbulb, X } from 'lucide-react';

export interface HelpStep {
  title: string;
  text: ReactNode;
}

export function HowItWorks({ open, onClose, steps, intro }: { open: boolean; onClose: () => void; steps: HelpStep[]; intro?: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
          aria-label="Come funziona questa pagina"
        >
          <div className="relative mb-6 rounded-3xl border border-brand-200 bg-brand-50/70 p-5 pr-12">
            <button onClick={onClose} className="btn-icon absolute right-2 top-2" aria-label="Nascondi spiegazione">
              <X size={18} />
            </button>
            <p className="flex items-center gap-2 font-bold text-brand-900">
              <Lightbulb size={18} className="text-brand-600" /> Come funziona
            </p>
            {intro && <p className="mt-1 text-sm text-brand-900/80">{intro}</p>}
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="size-7 shrink-0 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm">
                    <span className="block font-semibold text-slate-800">{s.title}</span>
                    <span className="block text-slate-600 leading-relaxed">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <button onClick={onClose} className="btn btn-secondary btn-sm mt-4">
              Ho capito, nascondi
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
