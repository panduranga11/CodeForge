import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/services/authApi';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import type { LoginFormData } from '@/features/auth/schemas/authSchemas';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '@/shared/types';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  return useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    },
    onError: (err: AxiosError<ApiResponse<never>>) => {
      toast.error(err.response?.data?.message ?? 'Invalid credentials');
    },
  });
}
