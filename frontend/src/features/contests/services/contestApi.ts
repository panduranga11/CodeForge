import { apiClient } from '@/shared/api/axiosClient';
import type {
  ApiResponse, PageResponse,
  Contest, CreateContestRequest, Problem,
  TestCase, LeaderboardEntry, JoinContestResponse,
} from '@/shared/types';

export const contestApi = {
  getAll: (page = 0, size = 10) =>
    apiClient.get<ApiResponse<PageResponse<Contest>>>('/contest/v1/contests/explore', {
      params: { page, size },
    }).then((r) => r.data),

  explore: (page = 0, size = 10) =>
    apiClient.get<ApiResponse<PageResponse<Contest>>>('/contest/v1/contests/explore', {
      params: { page, size },
    }).then((r) => r.data),

  myContests: (page = 0, size = 50) =>
    apiClient.get<ApiResponse<PageResponse<Contest>>>('/contest/v1/contests/my', {
      params: { page, size },
    }).then((r) => r.data),

  updateTimes: (id: string, startTime: string, endTime: string) =>
    apiClient.patch<ApiResponse<Contest>>(`/contest/v1/contests/${id}/times`, { startTime, endTime }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Contest>>(`/contest/v1/contests/${id}`).then((r) => r.data),

  create: (data: CreateContestRequest) =>
    apiClient.post<ApiResponse<Contest>>('/contest/v1/contests', data).then((r) => r.data),

  hostContest: (data: CreateContestRequest) =>
    apiClient.post<ApiResponse<Contest>>('/contest/v1/contests/host', data).then((r) => r.data),

  schedule: (id: string) =>
    apiClient.patch<ApiResponse<Contest>>(`/contest/v1/contests/${id}/schedule`).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.post<ApiResponse<Contest>>(`/contest/v1/contests/${id}/cancel`).then((r) => r.data),

  register: (id: string) =>
    apiClient.post<ApiResponse<void>>(`/contest/v1/contests/${id}/register`).then((r) => r.data),

  join: (inviteCode: string) =>
    apiClient.post<ApiResponse<JoinContestResponse>>('/contest/v1/contests/join', { inviteCode }).then((r) => r.data),

  getByInviteCode: (inviteCode: string) =>
    apiClient.get<ApiResponse<Contest>>(`/contest/v1/contests/join/${inviteCode}`).then((r) => r.data),

  isParticipant: (contestId: string, userId: string) =>
    apiClient.get<ApiResponse<boolean>>(`/contest/v1/contests/${contestId}/participants/${userId}`).then((r) => r.data),

  // Problems
  getProblems: (contestId: string) =>
    apiClient.get<ApiResponse<Problem[]>>(`/contest/v1/contests/${contestId}/problems`).then((r) => r.data),

  getProblem: (contestId: string, problemId: string) =>
    apiClient.get<ApiResponse<Problem>>(`/contest/v1/contests/${contestId}/problems/${problemId}`).then((r) => r.data),

  createProblem: (contestId: string, data: Omit<Problem, 'id' | 'contestId' | 'status' | 'sampleTestCases' | 'createdAt'>) =>
    apiClient.post<ApiResponse<Problem>>(`/contest/v1/contests/${contestId}/problems`, data).then((r) => r.data),

  updateProblem: (contestId: string, problemId: string, data: Partial<Problem>) =>
    apiClient.patch<ApiResponse<Problem>>(`/contest/v1/contests/${contestId}/problems/${problemId}`, data).then((r) => r.data),

  publishProblem: (contestId: string, problemId: string) =>
    apiClient.patch<ApiResponse<Problem>>(`/contest/v1/contests/${contestId}/problems/${problemId}/publish`).then((r) => r.data),

  deleteProblem: (contestId: string, problemId: string) =>
    apiClient.delete<ApiResponse<void>>(`/contest/v1/contests/${contestId}/problems/${problemId}`).then((r) => r.data),

  // Test Cases
  createTestCase: (contestId: string, problemId: string, data: Omit<TestCase, 'id'>) =>
    apiClient.post<ApiResponse<TestCase>>(`/contest/v1/contests/${contestId}/problems/${problemId}/testcases`, data).then((r) => r.data),

  getTestCases: (contestId: string, problemId: string, type?: string) =>
    apiClient.get<ApiResponse<TestCase[]>>(`/contest/v1/contests/${contestId}/problems/${problemId}/testcases`, {
      params: type ? { type } : undefined,
    }).then((r) => r.data),

  // Leaderboard
  getLeaderboard: (contestId: string, page = 0, size = 50) =>
    apiClient.get<ApiResponse<PageResponse<LeaderboardEntry>>>(`/contest/v1/leaderboard/contest/${contestId}`, {
      params: { page, size },
    }).then((r) => r.data),
};
