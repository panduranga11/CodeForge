import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/features/auth/services/authApi';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import type { RegisterFormData } from '@/features/auth/schemas/authSchemas';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '@/shared/types';

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterFormData) => authApi.register({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    }),
    onSuccess: (response) => {
      const { user, accessToken, refreshToken } = response.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Account created!');
      navigate('/dashboard', { replace: true });
    },
    onError: (err: AxiosError<ApiResponse<never>>) => {
      toast.error(err.response?.data?.message ?? 'Registration failed');
    },
  });
}
