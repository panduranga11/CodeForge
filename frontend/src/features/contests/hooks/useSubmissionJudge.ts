import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { executionApi } from '@/features/contests/services/executionApi';
import { qk } from '@/shared/constants/queryKeys';
import { CONFIG } from '@/shared/constants/config';
import { isTerminal } from '@/shared/lib/verdict';
import type { Submission } from '@/shared/types';

type JudgeStatus = 'idle' | 'judging' | 'resolved' | 'error';

export function useSubmissionJudge() {
  const queryClient = useQueryClient();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [status, setStatus] = useState<JudgeStatus>('idle');
  const [startedAt, setStartedAt] = useState<number>(0);

  const { data } = useQuery({
    queryKey: qk.submission(submissionId!),
    queryFn: () => executionApi.getById(submissionId!),
    enabled: !!submissionId && status === 'judging',
    refetchInterval: (query) => {
      const sub = query.state.data?.data;
      if (sub && isTerminal(sub.verdict)) return false;
      if (Date.now() - startedAt > CONFIG.SUBMISSION_POLL_TIMEOUT) return false;
      return CONFIG.SUBMISSION_POLL_INTERVAL;
    },
  });

  const submission: Submission | undefined = data?.data;

  useEffect(() => {
    if (!submission || status !== 'judging') return;

    if (isTerminal(submission.verdict)) {
      setStatus('resolved');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  }, [submission, status, queryClient]);

  useEffect(() => {
    if (status !== 'judging') return;
    if (Date.now() - startedAt > CONFIG.SUBMISSION_POLL_TIMEOUT) {
      setStatus('error');
    }
  }, [status, startedAt, submission]);

  const startJudging = useCallback((id: string) => {
    setSubmissionId(id);
    setStatus('judging');
    setStartedAt(Date.now());
  }, []);

  const reset = useCallback(() => {
    setSubmissionId(null);
    setStatus('idle');
    setStartedAt(0);
  }, []);

  return {
    status,
    submission,
    verdict: submission?.verdict,
    testResults: submission?.testResults,
    elapsedMs: status === 'judging' ? Date.now() - startedAt : 0,
    startJudging,
    reset,
  };
}
