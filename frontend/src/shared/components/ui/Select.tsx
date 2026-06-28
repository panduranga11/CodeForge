import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  error?: boolean;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, error, placeholder, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border bg-forge-surface px-3 py-2 text-sm text-forge-text transition-colors appearance-none',
        'focus:outline-none focus:ring-2 focus:ring-ember-500/50 focus:border-ember-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error
          ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
          : 'border-forge-border',
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
);

Select.displayName = 'Select';
