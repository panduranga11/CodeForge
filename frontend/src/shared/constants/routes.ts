export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  OAUTH_CALLBACK: '/oauth/callback',
  DASHBOARD: '/dashboard',
  CONTESTS: '/contests',
  CONTEST_DETAIL: (id: string) => `/contests/${id}`,
  CONTEST_EDIT: (id: string) => `/contests/${id}/edit`,
  CONTEST_LEADERBOARD: (contestId: string) => `/contests/${contestId}/leaderboard`,
  CONTEST_ANALYTICS: (contestId: string) => `/contests/${contestId}/analytics`,
  CREATE_CONTEST: '/contests/create',
  JOIN_CONTEST: '/contests/join',
  PROBLEM_DETAIL: (contestId: string, problemId: string) =>
    `/contests/${contestId}/problems/${problemId}`,
  PROBLEM_SOLVE: (contestId: string, problemId: string) =>
    `/contests/${contestId}/problems/${problemId}/solve`,
  PROBLEM_ADD: (contestId: string) => `/contests/${contestId}/problems/add`,
  PROBLEM_EDIT: (contestId: string, problemId: string) =>
    `/contests/${contestId}/problems/${problemId}/edit`,
  TEST_CASES: (contestId: string, problemId: string) =>
    `/contests/${contestId}/problems/${problemId}/testcases`,
  SUBMISSIONS: '/submissions',
  PROFILE: '/profile',
  KITCHEN_SINK: '/_kitchensink',
} as const;
