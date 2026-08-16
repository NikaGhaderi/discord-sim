import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@shared/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, id, label, ...props }, ref) => {
    const inputId = id ?? props.name;
    const errorId = error && inputId ? `${inputId}-error` : undefined;

    return (
      <label className="grid gap-2 text-sm font-medium text-foreground" htmlFor={inputId}>
        {label}
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            'min-h-24 rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted/70',
            'transition hover:border-muted focus:border-brand',
            error && 'border-danger',
            className
          )}
          {...props}
        />
        {error ? (
          <span id={errorId} className="text-xs font-normal text-danger">
            {error}
          </span>
        ) : null}
      </label>
    );
  }
);
Textarea.displayName = 'Textarea';
