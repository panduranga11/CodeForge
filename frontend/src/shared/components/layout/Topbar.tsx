import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { cn } from '@/shared/lib/cn';

interface TopbarProps {
  backTo: string;
  backLabel?: string;
  title: string;
  right?: ReactNode;
  className?: string;
}

export function Topbar({ backTo, backLabel = 'Back', title, right, className }: TopbarProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        'flex items-center justify-between h-14 px-4 border-b border-forge-border bg-forge-dark/80 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => navigate(backTo)}
        >
          {backLabel}
        </Button>
        <span className="text-sm font-medium text-forge-text truncate max-w-xs">
          {title}
        </span>
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </header>
  );
}
