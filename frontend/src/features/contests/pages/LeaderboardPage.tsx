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
import type { LeaderboardEntry } from '@/shared/types';

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

      {/* Top-3 Podium */}
      {!isLoading && entries.length >= 1 && page === 0 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {entries.length >= 2 && (
            <PodiumCard entry={entries[1]} rank={2} height="h-20" />
          )}
          <PodiumCard entry={entries[0]} rank={1} height="h-28" />
          {entries.length >= 3 && (
            <PodiumCard entry={entries[2]} rank={3} height="h-14" />
          )}
        </div>
      )}

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
                  {isMe ? `${entry.fullName || user.fullName} (You)` : entry.fullName || entry.userId.slice(0, 8)}
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

const PODIUM_CONFIG: Record<number, { border: string; bg: string; text: string; medal: string }> = {
  1: { border: 'border-amber-400/40', bg: 'bg-amber-400/10', text: 'text-amber-400', medal: '🏆' },
  2: { border: 'border-slate-400/30', bg: 'bg-slate-400/8', text: 'text-slate-300', medal: '🥈' },
  3: { border: 'border-amber-700/30', bg: 'bg-amber-700/8', text: 'text-amber-600', medal: '🥉' },
};

function PodiumCard({ entry, rank, height }: { entry: LeaderboardEntry; rank: number; height: string }) {
  const c = PODIUM_CONFIG[rank];
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 max-w-[160px]">
      <span className="text-2xl">{c.medal}</span>
      <p className={cn('text-sm font-bold truncate w-full text-center', c.text)}>
        {entry.fullName || entry.userId.slice(0, 8)}
      </p>
      <p className="text-xs text-forge-muted">{entry.score} pts</p>
      <div className={cn(
        'w-full rounded-t-xl border-t border-x flex items-center justify-center',
        height, c.border, c.bg,
      )}>
        <span className={cn('text-2xl font-black', c.text)}>{rank}</span>
      </div>
    </div>
  );
}
