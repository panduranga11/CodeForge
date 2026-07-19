import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Mail, Calendar, Save, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { authApi } from '@/features/auth/services/authApi';
import { formatDate } from '@/shared/lib/format';
import {
  PageHeader, Card, Avatar, Button, Field, Input, Badge,
} from '@/shared/components/ui';
import type { AxiosError } from 'axios';
import type { ApiResponse, UpdateProfileRequest } from '@/shared/types';

export function ProfilePage() {
  const { user, setUser, setAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset } = useForm<UpdateProfileRequest>({
    defaultValues: { fullName: user?.fullName },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => authApi.updateProfile(data),
    onSuccess: (res) => { setUser(res.data); toast.success('Profile updated'); setIsEditing(false); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Update failed'),
  });

  const upgradeMutation = useMutation({
    mutationFn: () => authApi.upgradeToOrganizer(),
    onSuccess: (res) => { setAuth(res.data.user, res.data.accessToken, res.data.refreshToken); toast.success('Upgraded to Organizer!'); queryClient.invalidateQueries(); },
    onError: () => toast.error('Upgrade failed'),
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile" subtitle="Manage your account settings" />

      {/* Avatar + Info */}
      <Card className="mb-6">
        <div className="flex items-center gap-5">
          <Avatar name={user.fullName} size="lg" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-forge-white">{user.fullName}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-forge-muted">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> <Badge variant="ember">{user.role}</Badge></span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined {formatDate(user.createdAt)}</span>
            </div>
          </div>
          {user.role === 'STUDENT' && (
            <Button variant="surface" leftIcon={<Zap className="h-4 w-4" />} loading={upgradeMutation.isPending} onClick={() => upgradeMutation.mutate()}>
              Become Organizer
            </Button>
          )}
        </div>
      </Card>

      {/* Edit Profile */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-forge-white">Edit Profile</h3>
          {!isEditing && (
            <Button variant="link" onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>

        <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
          <Field label="Full Name" htmlFor="prof-name">
            <Input id="prof-name" disabled={!isEditing} {...register('fullName')} />
          </Field>

          {isEditing && (
            <>
              <Field label="Current Password" htmlFor="prof-curpw">
                <Input id="prof-curpw" type="password" placeholder="Required to change password" {...register('currentPassword')} />
              </Field>
              <Field label="New Password" htmlFor="prof-newpw">
                <Input id="prof-newpw" type="password" placeholder="Leave empty to keep current" {...register('newPassword')} />
              </Field>
              <div className="flex gap-3">
                <Button type="submit" leftIcon={<Save className="h-4 w-4" />} loading={updateMutation.isPending}>
                  Save Changes
                </Button>
                <Button variant="surface" type="button" onClick={() => { setIsEditing(false); reset(); }}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
