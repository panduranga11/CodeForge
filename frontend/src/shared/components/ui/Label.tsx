import { type LabelHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, required, children, ...props }: LabelProps) {
  return (
    <label
      className={cn('text-sm font-medium text-forge-text', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-red-400">*</span>}
    </label>
  );
}
