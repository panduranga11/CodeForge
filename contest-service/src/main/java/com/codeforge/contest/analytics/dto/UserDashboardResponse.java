package com.codeforge.contest.analytics.dto;

public record UserDashboardResponse(
        long contestsParticipated,
        long totalSubmissions,
        long problemsSolved
) {}
