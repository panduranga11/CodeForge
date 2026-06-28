import { useQuery } from '@tanstack/react-query';
import { Trophy, Code, CheckCircle, TrendingUp, ArrowRight, Plus, Compass } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { contestApi } from '@/features/contests/services/contestApi';
import { apiClient } from '@/shared/api/axiosClient';
import { qk } from '@/shared/constants/queryKeys';
import { CONTEST_STATUS_LABEL } from '@/shared/constants/enums';
import { formatDateTime } from '@/shared/lib/format';
import {
  PageHeader, StatCard, Card, CardContent, Badge, Button,
  Skeleton, EmptyState,
} from '@/shared/components/ui';
import type { ApiResponse, Contest } from '@/shared/types';

interface UserDashboard {
  contestsParticipated: number;
  totalSubmissions: number;
  problemsSolved: number;
}

const STATUS_BADGE_VARIANT: Record<string, 'active' | 'scheduled' | 'completed' | 'draft' | 'cancelled'> = {
  ACTIVE: 'active',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  DRAFT: 'draft',
  CANCELLED: 'cancelled',
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: qk.dashboard(),
    queryFn: () =>
      apiClient.get<ApiResponse<UserDashboard>>('/contest/v1/analytics/user/dashboard').then((r) => r.data),
  });

  const { data: activeContests, isLoading: contestsLoading } = useQuery({
    queryKey: qk.contests('explore', 0),
    queryFn: () => contestApi.explore(0, 6),
  });

  const d = stats?.data;
  const successRate = d?.totalSubmissions
    ? `${Math.round((d.problemsSolved / d.totalSubmissions) * 100)}%`
    : '0%';

  const contests = activeContests?.data?.content ?? [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.fullName?.split(' ')[0] ?? 'coder'}`}
        subtitle="Here's an overview of your coding journey"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/contests/create')}>
            Host a Contest
          </Button>
        }
      />

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={<Trophy className="h-5 w-5" />} label="Contests Joined" value={d?.contestsParticipated ?? 0} />
          <StatCard icon={<Code className="h-5 w-5" />} label="Submissions" value={d?.totalSubmissions ?? 0} accent="text-blue-400" />
          <StatCard icon={<CheckCircle className="h-5 w-5" />} label="Problems Solved" value={d?.problemsSolved ?? 0} accent="text-success" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Success Rate" value={successRate} accent="text-violet-400" />
        </div>
      )}

      {/* Active Contests */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-forge-white">Explore Contests</h2>
        <Link
          to="/contests"
          className="flex items-center gap-1.5 text-sm text-ember-400 hover:text-ember-500 font-medium transition-colors"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {contestsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : contests.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-12 w-12" />}
          title="No contests available yet"
          description="Check back later or create your own contest"
          action={
            <Button variant="surface" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/contests/create')}>
              Create Contest
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contests.map((contest: Contest) => (
            <Link key={contest.id} to={`/contests/${contest.id}`}>
              <Card interactive className="h-full">
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={STATUS_BADGE_VARIANT[contest.status] ?? 'neutral'}>
                      {CONTEST_STATUS_LABEL[contest.status]}
                    </Badge>
                    {contest.visibility === 'PRIVATE' && (
                      <Badge variant="neutral">Private</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-forge-white mb-2 truncate">
                    {contest.title}
                  </h3>
                  <p className="text-sm text-forge-muted line-clamp-2 mb-4">{contest.description}</p>
                  <div className="flex items-center justify-between text-xs text-steel-400">
                    <span>{contest.problemCount} problems</span>
                    <span>{formatDateTime(contest.startTime)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
