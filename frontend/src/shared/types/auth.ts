export type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type AuthType = 'LOCAL' | 'OAUTH' | 'BOTH';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl: string | null;
  authType: AuthType;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
}
