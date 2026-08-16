import type { HTMLAttributes } from 'react';

import { cn } from '@shared/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface/90 shadow-[0_24px_80px_rgb(0_0_0/18%)] backdrop-blur',
        className
      )}
      {...props}
    />
  );
}
