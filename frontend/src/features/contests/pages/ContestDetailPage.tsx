import { useState, Fragment } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Clock, Users, Code, ArrowRight, CheckCircle, Play, Calendar, Plus, Rocket, XCircle, Trash2, Eye, Pencil, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { contestApi } from '@/features/contests/services/contestApi';
import { useAuthStore } from '@/features/auth/hooks/useAuthStore';
import { qk } from '@/shared/constants/queryKeys';
import { CONTEST_STATUS_LABEL, DIFFICULTY_LABEL } from '@/shared/constants/enums';
import { formatDateTime } from '@/shared/lib/format';
import {
  PageHeader, StatCard, Badge, Card, Button, CopyButton, Input, Field,
  Skeleton, EmptyState, Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@/shared/components/ui';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '@/shared/types';

const STATUS_BADGE_VARIANT: Record<string, 'active' | 'scheduled' | 'completed' | 'draft' | 'cancelled'> = {
  ACTIVE: 'active', SCHEDULED: 'scheduled', COMPLETED: 'completed', DRAFT: 'draft', CANCELLED: 'cancelled',
};

const DIFF_VARIANT: Record<string, 'easy' | 'medium' | 'hard'> = {
  EASY: 'easy', MEDIUM: 'medium', HARD: 'hard',
};

export function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [timesDialogOpen, setTimesDialogOpen] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  const { data: contestData, isLoading } = useQuery({
    queryKey: qk.contest(id!),
    queryFn: () => contestApi.getById(id!),
    enabled: !!id,
  });

  const { data: problemsData } = useQuery({
    queryKey: qk.problems(id!),
    queryFn: () => contestApi.getProblems(id!),
    enabled: !!id && (
      contestData?.data?.hostId === user?.id ||
      contestData?.data?.status === 'ACTIVE' ||
      contestData?.data?.status === 'COMPLETED'
    ),
  });

  const { data: isParticipant } = useQuery({
    queryKey: qk.isParticipant(id!),
    queryFn: () => contestApi.isParticipant(id!, user!.id),
    enabled: !!id && !!user,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.contest(id!) });
    queryClient.invalidateQueries({ queryKey: qk.problems(id!) });
    queryClient.invalidateQueries({ queryKey: qk.isParticipant(id!) });
  };

  const registerMutation = useMutation({
    mutationFn: () => contestApi.register(id!),
    onSuccess: () => { toast.success('Registered successfully!'); invalidate(); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to register'),
  });

  const scheduleMutation = useMutation({
    mutationFn: () => contestApi.schedule(id!),
    onSuccess: () => { toast.success('Contest scheduled!'); invalidate(); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to schedule'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => contestApi.cancel(id!),
    onSuccess: () => { toast.success('Contest cancelled'); setCancelDialogOpen(false); invalidate(); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to cancel'),
  });

  const publishMutation = useMutation({
    mutationFn: (problemId: string) => contestApi.publishProblem(id!, problemId),
    onSuccess: () => { toast.success('Problem published!'); invalidate(); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to publish'),
  });

  const deleteProblemMutation = useMutation({
    mutationFn: (problemId: string) => contestApi.deleteProblem(id!, problemId),
    onSuccess: () => { toast.success('Problem deleted'); setDeleteTarget(null); invalidate(); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to delete'),
  });

  const updateTimesMutation = useMutation({
    mutationFn: () => contestApi.updateTimes(id!, new Date(newStartTime).toISOString(), new Date(newEndTime).toISOString()),
    onSuccess: () => { toast.success('Times updated!'); setTimesDialogOpen(false); invalidate(); },
    onError: (err: AxiosError<ApiResponse<never>>) => toast.error(err.response?.data?.message ?? 'Failed to update times'),
  });

  const contest = contestData?.data;
  const problems = problemsData?.data ?? [];
  const participating = isParticipant?.data ?? false;
  const isHost = contest?.hostId === user?.id;

  const toDatetimeLocal = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
        <div className="grid grid-cols-4 gap-4 mt-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <EmptyState
        title="Contest not found"
        action={<Button variant="surface" onClick={() => navigate('/contests')}>Back to contests</Button>}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={contest.title}
        subtitle={contest.description}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[contest.status] ?? 'neutral'}>
              {CONTEST_STATUS_LABEL[contest.status]}
            </Badge>
            {isHost && <Badge variant="ember">Host</Badge>}
          </div>
        }
      />

      <ContestLifecycle status={contest.status} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users className="h-5 w-5" />} label="Participants" value={contest.participantCount} />
        <StatCard icon={<Code className="h-5 w-5" />} label="Problems" value={contest.problemCount} accent="text-blue-400" />
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Starts" value={formatDateTime(contest.startTime)} accent="text-success" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Ends" value={formatDateTime(contest.endTime)} accent="text-violet-400" />
      </div>

      {/* Host Actions */}
      {isHost && (
        <Card className="mb-8 border-ember-500/20">
          <h3 className="text-sm font-semibold text-ember-400 uppercase tracking-wider mb-4">Host Actions</h3>
          <div className="flex flex-wrap items-center gap-3">
            {contest.status === 'DRAFT' && (
              <Button leftIcon={<Rocket className="h-4 w-4" />} loading={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate()}>
                Schedule Contest
              </Button>
            )}
            {(contest.status === 'DRAFT' || contest.status === 'SCHEDULED') && (
              <Button variant="surface" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(`/contests/${id}/problems/add`)}>
                Add Problem
              </Button>
            )}
            {(contest.status === 'DRAFT' || contest.status === 'SCHEDULED') && (
              <Button variant="surface" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => { setNewStartTime(toDatetimeLocal(contest.startTime)); setNewEndTime(toDatetimeLocal(contest.endTime)); setTimesDialogOpen(true); }}>
                Update Times
              </Button>
            )}
            {(contest.status === 'DRAFT' || contest.status === 'SCHEDULED') && (
              <Button variant="danger" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setCancelDialogOpen(true)}>
                Cancel Contest
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Participant Actions */}
      <div className="flex items-center gap-3 mb-8">
        {!isHost && !participating && (contest.status === 'SCHEDULED' || contest.status === 'ACTIVE') && (
          <Button loading={registerMutation.isPending} onClick={() => registerMutation.mutate()}>
            Register Now
          </Button>
        )}
        {participating && (
          <Badge variant="ac" className="px-4 py-2.5 text-sm">
            <CheckCircle className="w-4 h-4 mr-1.5 inline" /> Registered
          </Badge>
        )}
        {contest.inviteCode && contest.status !== 'DRAFT' && (isHost || participating) && (
          <CopyButton value={contest.inviteCode} title="Copy invite code">
            <span className="font-mono tracking-widest">{contest.inviteCode}</span>
          </CopyButton>
        )}
        {contest.inviteLink && contest.status !== 'DRAFT' && (isHost || participating) && (
          <CopyButton value={contest.inviteLink} title="Copy invite link">
            <Link2 className="w-3.5 h-3.5" />
            Invite Link
          </CopyButton>
        )}
        <Button variant="surface" leftIcon={<Trophy className="h-4 w-4" />} onClick={() => navigate(`/contests/${id}/leaderboard`)}>
          Leaderboard
        </Button>
      </div>

      {/* Problems */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-forge-white">Problems</h2>
        {isHost && (contest.status === 'DRAFT' || contest.status === 'SCHEDULED') && (
          <Button variant="link" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(`/contests/${id}/problems/add`)}>
            Add Problem
          </Button>
        )}
      </div>

      {!isHost && contest.status !== 'ACTIVE' && contest.status !== 'COMPLETED' ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-xl border border-forge-border bg-forge-surface/30">
          <div className="w-12 h-12 rounded-full bg-forge-surface border border-forge-border flex items-center justify-center">
            <Clock className="w-5 h-5 text-forge-muted" />
          </div>
          <p className="text-sm font-medium text-forge-white">
            {contest.status === 'COMPLETED' || contest.status === 'CANCELLED'
              ? 'Problems are not available for this contest'
              : 'Problems will be revealed when the contest goes live'}
          </p>
          <p className="text-xs text-forge-muted">
            {contest.status === 'SCHEDULED'
              ? `Contest starts ${formatDateTime(contest.startTime)}`
              : contest.status === 'DRAFT'
              ? 'This contest has not been scheduled yet'
              : null}
          </p>
        </div>
      ) : problems.length === 0 ? (
        <EmptyState
          icon={<Code className="h-12 w-12" />}
          title="No problems available yet"
          action={isHost ? (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(`/contests/${id}/problems/add`)}>
              Add Your First Problem
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {problems.map((problem, idx) => (
            <div
              key={problem.id}
              className="flex items-center gap-4 bg-forge-dark border border-forge-border rounded-xl p-4 hover:border-ember-500/30 transition-all group"
            >
              <span className="w-8 h-8 rounded-lg bg-forge-surface flex items-center justify-center text-sm font-bold text-forge-muted">
                {idx + 1}
              </span>
              <Link to={`/contests/${id}/problems/${problem.id}`} className="flex-1 min-w-0">
                <h3 className="font-semibold text-forge-white group-hover:text-ember-400 transition-colors truncate">
                  {problem.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant={DIFF_VARIANT[problem.difficulty] ?? 'neutral'}>{DIFFICULTY_LABEL[problem.difficulty]}</Badge>
                  <span className="text-xs text-forge-muted">{problem.points} pts</span>
                  <span className="text-xs text-forge-muted">{problem.category.replace(/_/g, ' ')}</span>
                  <Badge variant={problem.status === 'PUBLISHED' ? 'ac' : 'draft'}>{problem.status}</Badge>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                {participating && contest.status === 'ACTIVE' && problem.status === 'PUBLISHED' && (
                  <Button variant="link" size="sm" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={() => navigate(`/contests/${id}/problems/${problem.id}`)}>
                    Solve
                  </Button>
                )}
                {isHost && (
                  <>
                    {problem.status === 'DRAFT' && (
                      <Button variant="link" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => publishMutation.mutate(problem.id)}>
                        Publish
                      </Button>
                    )}
                    <Button variant="link" size="sm" onClick={() => navigate(`/contests/${id}/problems/${problem.id}/testcases`)}>
                      Test Cases
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(problem.id)}
                      className="text-forge-muted hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <ArrowRight className="w-4 h-4 text-forge-muted group-hover:text-ember-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Dialog */}

      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
        <DialogHeader><DialogTitle>Cancel Contest</DialogTitle></DialogHeader>
        <DialogBody>
          <p className="text-sm text-forge-muted">Are you sure you want to cancel this contest? This action cannot be undone.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setCancelDialogOpen(false)}>Keep it</Button>
          <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate()}>Cancel Contest</Button>
        </DialogFooter>
      </Dialog>

      {/* Update Times Dialog */}
      <Dialog open={timesDialogOpen} onClose={() => setTimesDialogOpen(false)}>
        <DialogHeader><DialogTitle>Update Contest Times</DialogTitle></DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <Field label="Start Time" htmlFor="newStartTime" required>
              <Input id="newStartTime" type="datetime-local" value={newStartTime}
                min={toDatetimeLocal(new Date(Date.now() + 3 * 60000).toISOString())}
                onChange={(e) => setNewStartTime(e.target.value)} />
            </Field>
            <Field label="End Time" htmlFor="newEndTime" required>
              <Input id="newEndTime" type="datetime-local" value={newEndTime}
                min={newStartTime}
                onChange={(e) => setNewEndTime(e.target.value)} />
            </Field>
            <p className="text-xs text-forge-muted">Start must be at least 2 min in the future · End must be at least 15 min after start</p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setTimesDialogOpen(false)}>Cancel</Button>
          <Button loading={updateTimesMutation.isPending} onClick={() => updateTimesMutation.mutate()} disabled={!newStartTime || !newEndTime}>
            Update Times
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Problem Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader><DialogTitle>Delete Problem</DialogTitle></DialogHeader>
        <DialogBody>
          <p className="text-sm text-forge-muted">This will permanently delete the problem and all its test cases.</p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteProblemMutation.isPending} onClick={() => deleteTarget && deleteProblemMutation.mutate(deleteTarget)}>Delete</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

const LIFECYCLE_STEPS = [
  { key: 'DRAFT', label: 'Draft', Icon: Pencil },
  { key: 'SCHEDULED', label: 'Scheduled', Icon: Calendar },
  { key: 'ACTIVE', label: 'Live', Icon: Play },
  { key: 'COMPLETED', label: 'Completed', Icon: CheckCircle },
] as const;

function ContestLifecycle({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 mb-8 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 w-fit">
        <XCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-red-400">Contest Cancelled</span>
      </div>
    );
  }

  const currentIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center mb-8">
      {LIFECYCLE_STEPS.map(({ key, label, Icon }, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <Fragment key={key}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                isCurrent ? 'border-ember-500 bg-ember-500/20 text-ember-400' :
                isPast ? 'border-success bg-success/20 text-success' :
                'border-forge-border bg-forge-surface text-forge-muted'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className={`text-[11px] font-medium ${
                isCurrent ? 'text-ember-400' : isPast ? 'text-success' : 'text-forge-muted'
              }`}>
                {label}
              </span>
            </div>
            {idx < LIFECYCLE_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-3 mb-5 rounded-full transition-all ${
                idx < currentIdx ? 'bg-success/50' : 'bg-forge-border'
              }`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
