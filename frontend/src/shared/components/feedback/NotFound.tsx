import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-forge-black flex items-center justify-center">
      <EmptyState
        icon={<Compass className="h-16 w-16" />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        action={
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        }
      />
    </div>
  );
}
