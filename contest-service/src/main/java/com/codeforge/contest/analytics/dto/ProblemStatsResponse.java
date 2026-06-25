package com.codeforge.contest.analytics.dto;

import java.util.UUID;

public record ProblemStatsResponse(
        UUID problemId,
        String title,
        int points,
        int sequenceNo
) {}
