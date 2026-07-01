import { useQuery } from '@tanstack/react-query';
import { Trophy, Code, CheckCircle, TrendingUp, ArrowRight, Plus, Compass, Users, Zap, Clock, CheckSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { contestApi } from '@/features/contests/services/contestApi';
import { apiClient } from '@/shared/api/axiosClient';
import { qk } from '@/shared/constants/queryKeys';
import {
  PageHeader, StatCard, Card, CardContent, Button,
  Skeleton, EmptyState,
} from '@/shared/components/ui';
import type { ApiResponse, Contest } from '@/shared/types';

interface UserDashboard {
  contestsParticipated: number;
  totalSubmissions: number;
  problemsSolved: number;
}

const STATUS_ACCENT: Record<string, string> = {
  ACTIVE: 'border-l-4 border-l-success',
  SCHEDULED: 'border-l-4 border-l-blue-400',
  COMPLETED: 'border-l-4 border-l-forge-muted',
  CANCELLED: 'border-l-4 border-l-red-500',
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-success',
  SCHEDULED: 'bg-blue-400',
  COMPLETED: 'bg-forge-muted',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Live now',
  SCHEDULED: 'Upcoming',
  COMPLETED: 'Ended',
};

const STATUS_ICON: Record<string, JSX.Element> = {
  ACTIVE: <Zap className="w-3 h-3 text-success" />,
  SCHEDULED: <Clock className="w-3 h-3 text-blue-400" />,
  COMPLETED: <CheckSquare className="w-3 h-3 text-forge-muted" />,
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
        subtitle="Your contest activity at a glance"
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
              <Card interactive className={`h-full ${STATUS_ACCENT[contest.status] ?? ''}`}>
                <CardContent className="flex flex-col h-full">
                  <div className="flex items-center gap-1.5 mb-3">
                    {STATUS_ICON[contest.status]}
                    <span className="text-xs font-medium text-forge-muted">
                      {STATUS_LABEL[contest.status] ?? contest.status}
                    </span>
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full ${STATUS_DOT[contest.status] ?? 'bg-forge-border'}`} />
                  </div>
                  <h3 className="text-base font-semibold text-forge-white mb-1.5 truncate">
                    {contest.title}
                  </h3>
                  <p className="text-sm text-forge-muted line-clamp-1 mb-4 flex-1">{contest.description}</p>
                  <div className="flex items-center gap-1 text-xs text-steel-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{contest.participantCount ?? 0} participants</span>
                    <span className="mx-1.5 text-forge-border">·</span>
                    <span>{contest.problemCount} problems</span>
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
