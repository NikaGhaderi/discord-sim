import type { HTMLAttributes, TableHTMLAttributes } from 'react';

import { cn } from '@shared/lib/cn';

export function TableContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('overflow-x-auto rounded-card border border-border', className)} {...props} />
  );
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn(
        'w-full min-w-[42rem] border-collapse text-left text-sm [&_td]:border-t [&_td]:border-border [&_td]:p-4 [&_th]:bg-surface-raised [&_th]:p-4 [&_th]:font-semibold',
        className
      )}
      {...props}
    />
  );
}
