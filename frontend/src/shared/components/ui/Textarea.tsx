import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-lg border bg-forge-surface px-3 py-2 text-sm text-forge-text placeholder:text-forge-muted resize-none transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-ember-500/50 focus:border-ember-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error
          ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
          : 'border-forge-border',
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = 'Textarea';
