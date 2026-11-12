import { useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<unknown> | unknown;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  children?: ReactNode;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Conferma', tone = 'danger', children }: Props) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      locked={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Annulla
          </button>
          <button
            type="button"
            className={cn('btn', tone === 'danger' ? 'btn-danger' : 'btn-primary')}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4 pt-2">
        <div
          className={cn(
            'size-11 shrink-0 rounded-2xl flex items-center justify-center',
            tone === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600',
          )}
        >
          <AlertTriangle size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <div className="mt-1 text-sm text-slate-500 leading-relaxed">{message}</div>
          {children}
        </div>
      </div>
    </Modal>
  );
}
