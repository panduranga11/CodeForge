import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  glow?: boolean;
}

export function Card({ className, interactive, glow, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-forge-border bg-forge-dark p-5',
        interactive && 'transition-all duration-200 hover:border-ember-500/40 hover:shadow-lg hover:shadow-ember-glow cursor-pointer',
        glow && 'shadow-lg shadow-ember-glow border-ember-500/30',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-forge-white', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  );
}
