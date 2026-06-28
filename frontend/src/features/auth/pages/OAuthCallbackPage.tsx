import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { authApi } from '@/features/auth/services/authApi';
import { Spinner } from '@/shared/components/ui';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      toast.error('OAuth login failed');
      navigate('/login', { replace: true });
      return;
    }

    useAuthStore.getState().setTokens(accessToken, refreshToken);

    authApi
      .getProfile()
      .then((res) => {
        setAuth(res.data, accessToken, refreshToken);
        toast.success('Welcome!');
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        toast.error('Failed to load profile');
        navigate('/login', { replace: true });
      });
  }, [params, setAuth, navigate]);

  return (
    <div className="min-h-screen bg-forge-black flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-forge-muted">Completing sign in...</p>
      </div>
    </div>
  );
}
