export const qk = {
  dashboard: () => ['dashboard'] as const,

  contests: (scope?: string, page?: number) =>
    ['contests', { scope, page }] as const,
  contest: (id: string) => ['contest', id] as const,

  problems: (contestId: string) => ['problems', contestId] as const,
  problem: (contestId: string, problemId: string) =>
    ['problem', contestId, problemId] as const,
  testCases: (contestId: string, problemId: string) =>
    ['testCases', contestId, problemId] as const,

  isParticipant: (contestId: string) =>
    ['isParticipant', contestId] as const,

  submissions: (contestId?: string) =>
    ['submissions', { contestId }] as const,
  submission: (id: string) => ['submission', id] as const,

  leaderboard: (contestId: string) =>
    ['leaderboard', contestId] as const,

  analytics: (contestId: string) => ['analytics', contestId] as const,
} as const;
