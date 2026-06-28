import type { Verdict } from '@/shared/types';

const TERMINAL_VERDICTS: ReadonlySet<Verdict> = new Set(['AC', 'WA', 'CE', 'RE', 'TLE', 'MLE']);

export function isTerminal(verdict: Verdict): boolean {
  return TERMINAL_VERDICTS.has(verdict);
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  PENDING: 'Judging',
  AC: 'Accepted',
  WA: 'Wrong Answer',
  CE: 'Compilation Error',
  RE: 'Runtime Error',
  TLE: 'Time Limit Exceeded',
  MLE: 'Memory Limit Exceeded',
};

export const VERDICT_COLOR: Record<Verdict, string> = {
  PENDING: 'text-forge-muted',
  AC: 'text-success',
  WA: 'text-red-500',
  CE: 'text-yellow-500',
  RE: 'text-violet-500',
  TLE: 'text-blue-500',
  MLE: 'text-orange-400',
};

export const VERDICT_BG: Record<Verdict, string> = {
  PENDING: 'bg-forge-muted/20',
  AC: 'bg-success/20',
  WA: 'bg-red-500/20',
  CE: 'bg-yellow-500/20',
  RE: 'bg-violet-500/20',
  TLE: 'bg-blue-500/20',
  MLE: 'bg-orange-400/20',
};
