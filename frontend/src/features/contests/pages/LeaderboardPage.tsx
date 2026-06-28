import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal } from 'lucide-react';
import { contestApi } from '@/features/contests/services/contestApi';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { qk } from '@/shared/constants/queryKeys';
import { cn } from '@/shared/lib/cn';
import {
  PageHeader, Skeleton, EmptyState, Pagination, Button,
} from '@/shared/components/ui';

const RANK_STYLE: Record<number, string> = {
  1: 'text-[#fbbf24] bg-[#fbbf24]/10',
  2: 'text-[#94a3b8] bg-[#94a3b8]/10',
  3: 'text-[#cd7f32] bg-[#cd7f32]/10',
};

export function LeaderboardPage() {
  const { contestId } = useParams<{ contestId: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const { data: contestData } = useQuery({
    queryKey: qk.contest(contestId!),
    queryFn: () => contestApi.getById(contestId!),
    enabled: !!contestId,
  });

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: qk.leaderboard(contestId!),
    queryFn: () => contestApi.getLeaderboard(contestId!, page, 50),
    enabled: !!contestId,
    refetchInterval: 15_000,
  });

  const contest = contestData?.data;
  const entries = leaderboardData?.data?.content ?? [];
  const totalPages = leaderboardData?.data?.totalPages ?? 0;

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        subtitle={contest?.title}
        actions={
          <Button variant="surface" leftIcon={<Trophy className="h-4 w-4" />} onClick={() => navigate(`/contests/${contestId}`)}>
            Back to Contest
          </Button>
        }
      />

      <div className="bg-forge-dark border border-forge-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 px-5 py-3 border-b border-forge-border text-xs font-semibold text-forge-muted uppercase tracking-wider">
          <span>Rank</span>
          <span>User</span>
          <span className="text-right">Score</span>
          <span className="text-right">Solved</span>
          <span className="text-right">Penalty</span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Medal className="h-12 w-12" />}
            title="No submissions yet"
            description="The leaderboard will update when participants submit solutions"
          />
        ) : (
          entries.map((entry) => {
            const isMe = entry.userId === user?.id;
            return (
              <div
                key={entry.userId}
                className={cn(
                  'grid grid-cols-[60px_1fr_100px_100px_100px] gap-4 px-5 py-3.5 items-center border-b border-forge-border/50 last:border-b-0 hover:bg-forge-surface/50 transition-colors',
                  isMe && 'bg-ember-500/5',
                )}
              >
                <span className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                  RANK_STYLE[entry.rank] ?? 'text-forge-muted bg-forge-surface',
                )}>
                  {entry.rank}
                </span>
                <span className={cn('text-sm font-medium truncate', isMe ? 'text-ember-400' : 'text-forge-text')}>
                  {isMe ? `${user.fullName} (You)` : entry.userId.slice(0, 8)}
                </span>
                <span className="text-right text-sm font-bold text-forge-white">{entry.score}</span>
                <span className="text-right text-sm text-forge-muted">{entry.problemsSolved}</span>
                <span className="text-right text-sm text-forge-muted font-mono">{entry.penaltyTime}s</span>
              </div>
            );
          })
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="mt-6" />
    </div>
  );
}
