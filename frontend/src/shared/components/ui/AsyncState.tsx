import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@shared/components/ui/Button';

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center text-muted" role="status">
      <span className="flex items-center gap-3">
        <LoaderCircle className="animate-spin" size={20} aria-hidden />
        {label}
      </span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-card border border-dashed border-border p-8 text-center">
      <div>
        <Inbox className="mx-auto text-muted" size={28} aria-hidden />
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  detail,
  onRetry,
}: {
  title?: string;
  detail: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-card border border-danger/40 bg-danger/5 p-6" role="alert">
      <div className="flex gap-3">
        <AlertTriangle className="shrink-0 text-danger" size={22} aria-hidden />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{detail}</p>
          {onRetry ? (
            <Button className="mt-4" variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
