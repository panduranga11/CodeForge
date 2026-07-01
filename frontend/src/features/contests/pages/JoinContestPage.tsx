import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Users, Calendar, Clock, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { formatDateTime } from '@/shared/lib/format';
import { Button, Skeleton } from '@/shared/components/ui';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '@/shared/types';

export function JoinContestPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();

  const { data: contestData, isLoading, error } = useQuery({
    queryKey: ['join-preview', inviteCode],
    queryFn: () => contestApi.getByInviteCode(inviteCode!),
    enabled: !!inviteCode,
    retry: false,
  });

  const joinMutation = useMutation({
    mutationFn: () => contestApi.join(inviteCode!),
    onSuccess: (data) => {
      toast.success('Joined contest successfully!');
      navigate(`/contests/${data.data.contestId}`);
    },
    onError: (err: AxiosError<ApiResponse<never>>) =>
      toast.error(err.response?.data?.message ?? 'Failed to join contest'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forge-black flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !contestData?.data) {
    return (
      <div className="min-h-screen bg-forge-black flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-forge-muted mb-4">This invite link is invalid or has expired.</p>
          <Button variant="surface" onClick={() => navigate('/contests')}>Browse Contests</Button>
        </div>
      </div>
    );
  }

  const contest = contestData.data;

  return (
    <div className="min-h-screen bg-forge-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-forge-dark border border-forge-border rounded-2xl p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold text-ember-400 uppercase tracking-widest mb-2">Private Invitation</p>
            <h1 className="text-2xl font-bold text-forge-white mb-2">{contest.title}</h1>
            <p className="text-sm text-forge-muted">{contest.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-forge-surface rounded-xl p-3">
              <div className="flex items-center gap-2 text-forge-muted mb-1">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs">Participants</span>
              </div>
              <p className="text-lg font-semibold text-forge-white">{contest.participantCount ?? 0}</p>
            </div>
            <div className="bg-forge-surface rounded-xl p-3">
              <div className="flex items-center gap-2 text-forge-muted mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">Starts</span>
              </div>
              <p className="text-sm font-semibold text-forge-white">{formatDateTime(contest.startTime)}</p>
            </div>
            <div className="bg-forge-surface rounded-xl p-3 col-span-2">
              <div className="flex items-center gap-2 text-forge-muted mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">Ends</span>
              </div>
              <p className="text-sm font-semibold text-forge-white">{formatDateTime(contest.endTime)}</p>
            </div>
          </div>

          <Button
            className="w-full"
            leftIcon={<LogIn className="w-4 h-4" />}
            loading={joinMutation.isPending}
            onClick={() => joinMutation.mutate()}
          >
            Join Contest
          </Button>
        </div>
      </div>
    </div>
  );
}
