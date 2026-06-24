package com.codeforge.contest.analytics.dto;

import java.util.List;
import java.util.UUID;

public record ContestAnalyticsResponse(
        UUID contestId,
        long totalParticipants,
        long totalProblems,
        List<ProblemStatsResponse> problemStats
) {}
