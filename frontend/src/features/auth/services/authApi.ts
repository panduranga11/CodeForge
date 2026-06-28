import { apiClient } from '@/shared/api/axiosClient';
import type { ApiResponse, TokenResponse, LoginRequest, RegisterRequest, User, UpdateProfileRequest, OAuthProviderResponse } from '@/shared/types';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<TokenResponse>>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<TokenResponse>>('/auth/register', data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<TokenResponse>>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (accessToken: string, refreshToken: string) =>
    apiClient.post<ApiResponse<void>>('/auth/logout', { refreshToken }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.data),

  getProfile: () =>
    apiClient.get<ApiResponse<User>>('/auth/profile').then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<ApiResponse<User>>('/auth/profile', data).then((r) => r.data),

  upgradeToOrganizer: () =>
    apiClient.patch<ApiResponse<TokenResponse>>('/auth/upgrade-to-organizer').then((r) => r.data),

  getOAuthProviders: () =>
    apiClient.get<ApiResponse<OAuthProviderResponse[]>>('/auth/oauth2/providers').then((r) => r.data),

  unlinkOAuth: (provider: string) =>
    apiClient.delete<ApiResponse<void>>(`/auth/oauth2/unlink/${provider}`).then((r) => r.data),
};
