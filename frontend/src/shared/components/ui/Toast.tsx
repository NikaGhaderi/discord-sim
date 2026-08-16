import { CheckCircle2, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { Button } from '@shared/components/ui/Button';

interface ToastItem {
  id: string;
  message: string;
}

interface ToastContextValue {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function generateToastId() {
  // crypto.randomUUID() throws in non-secure contexts (e.g. plain http:// in local dev),
  // so fall back to a simpler unique-enough id in that case.
  if (typeof crypto === 'undefined' || !crypto.randomUUID) {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return crypto.randomUUID();
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeoutIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const timeoutIds = timeoutIdsRef.current;
    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.clear();
    };
  }, []);

  const toast = useCallback((message: string) => {
    const id = generateToastId();
    setItems((current) => [...current, { id, message }]);
    const timeoutId = window.setTimeout(() => {
      timeoutIdsRef.current.delete(timeoutId);
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4_000);
    timeoutIdsRef.current.add(timeoutId);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 grid w-[min(24rem,calc(100%-2rem))] gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3 shadow-2xl"
          >
            <CheckCircle2 className="text-success" size={19} aria-hidden />
            <p className="flex-1 text-sm">{item.message}</p>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Dismiss notification"
              onClick={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))}
            >
              <X size={16} aria-hidden />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
