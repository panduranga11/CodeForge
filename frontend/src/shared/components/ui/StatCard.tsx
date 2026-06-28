import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  accent?: string;
  className?: string;
}

export function StatCard({ icon, label, value, accent = 'text-ember-500', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-forge-border bg-forge-dark p-4',
        className,
      )}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forge-surface', accent)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-forge-muted">{label}</p>
        <p className="text-xl font-semibold text-forge-white">{value}</p>
      </div>
    </div>
  );
}
