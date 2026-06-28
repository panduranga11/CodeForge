import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Label } from './Label';

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, error, hint, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && hint && <p className="text-sm text-forge-muted">{hint}</p>}
    </div>
  );
}
