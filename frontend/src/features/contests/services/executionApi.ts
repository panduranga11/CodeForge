import { apiClient } from '@/shared/api/axiosClient';
import type { ApiResponse, PageResponse, Submission, CreateSubmissionRequest, RunResponse } from '@/shared/types';

export const executionApi = {
  submit: (data: CreateSubmissionRequest) =>
    apiClient.post<ApiResponse<Submission>>('/exec/v1/submissions', data).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Submission>>(`/exec/v1/submissions/${id}`).then((r) => r.data),

  getAll: (params?: { contestId?: string; page?: number; size?: number }) =>
    apiClient.get<ApiResponse<PageResponse<Submission>>>('/exec/v1/submissions', {
      params,
    }).then((r) => r.data),

  run: (data: { language: string; sourceCode: string; customInput?: string }) =>
    apiClient.post<ApiResponse<RunResponse>>('/exec/v1/run', data).then((r) => r.data),
};
