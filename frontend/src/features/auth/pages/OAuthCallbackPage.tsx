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
    // Success handler puts tokens in the URL fragment (#), not the query
    // string, so they're never sent to a server in access logs.
    const fragmentParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragmentParams.get('accessToken') ?? params.get('accessToken');
    const refreshToken = fragmentParams.get('refreshToken') ?? params.get('refreshToken');

    // Scrub tokens from the address bar and browser history immediately
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

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
        // Don't leave half-authenticated state (tokens set, no user) behind
        useAuthStore.getState().logout();
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
