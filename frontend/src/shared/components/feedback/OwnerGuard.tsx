import { type ReactNode } from 'react';
import { ShieldX } from 'lucide-react';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { EmptyState } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui';
import { useNavigate } from 'react-router-dom';

interface OwnerGuardProps {
  hostId: string;
  children: ReactNode;
}

export function OwnerGuard({ hostId, children }: OwnerGuardProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();

  if (userId !== hostId) {
    return (
      <EmptyState
        icon={<ShieldX className="h-12 w-12" />}
        title="Not authorized"
        description="Only the contest host can access this page."
        action={<Button variant="surface" onClick={() => navigate(-1)}>Go back</Button>}
      />
    );
  }

  return <>{children}</>;
}
