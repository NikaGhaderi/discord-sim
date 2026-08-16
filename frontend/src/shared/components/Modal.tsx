import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@shared/lib/cn';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ title, onClose, children, className }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={cn(
          'w-[min(32rem,calc(100%-2rem))] max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-surface-raised p-0 text-foreground shadow-[0_24px_80px_rgb(0_0_0/40%)] backdrop-blur',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-foreground"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
