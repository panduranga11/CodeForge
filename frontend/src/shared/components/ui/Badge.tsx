import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
  {
    variants: {
      variant: {
        neutral: 'bg-forge-surface text-forge-text ring-forge-border',
        // Contest status
        draft: 'bg-forge-muted/20 text-forge-muted ring-forge-muted/30',
        scheduled: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
        active: 'bg-success/15 text-success ring-success/30',
        completed: 'bg-steel-400/15 text-steel-400 ring-steel-400/30',
        cancelled: 'bg-red-500/15 text-red-400 ring-red-500/30',
        // Verdicts
        ac: 'bg-success/15 text-success ring-success/30',
        wa: 'bg-red-500/15 text-red-400 ring-red-500/30',
        ce: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/30',
        re: 'bg-violet-500/15 text-violet-400 ring-violet-500/30',
        tle: 'bg-blue-500/15 text-blue-400 ring-blue-500/30',
        mle: 'bg-orange-400/15 text-orange-400 ring-orange-400/30',
        pending: 'bg-forge-muted/20 text-forge-muted ring-forge-muted/30 animate-pulse',
        // Difficulty
        easy: 'bg-success/15 text-success ring-success/30',
        medium: 'bg-warning/15 text-warning ring-warning/30',
        hard: 'bg-red-500/15 text-red-400 ring-red-500/30',
        // Accent
        ember: 'bg-ember-500/15 text-ember-400 ring-ember-500/30',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
