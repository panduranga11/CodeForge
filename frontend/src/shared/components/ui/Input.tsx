import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightSlot, ...props }, ref) => (
    <div className="relative">
      {leftIcon && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forge-muted">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border bg-forge-surface px-3 py-2 text-sm text-forge-text placeholder:text-forge-muted transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ember-500/50 focus:border-ember-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
            : 'border-forge-border',
          leftIcon && 'pl-10',
          rightSlot && 'pr-10',
          className,
        )}
        {...props}
      />
      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightSlot}
        </div>
      )}
    </div>
  ),
);

Input.displayName = 'Input';
