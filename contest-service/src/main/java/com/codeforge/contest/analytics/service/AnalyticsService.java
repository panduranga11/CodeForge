package com.codeforge.contest.analytics.service;

import com.codeforge.contest.analytics.dto.ContestAnalyticsResponse;
import com.codeforge.contest.analytics.dto.UserDashboardResponse;
import com.codeforge.contest.shared.event.SubmissionCompletedEvent;

import java.util.UUID;

public interface AnalyticsService {

    ContestAnalyticsResponse getContestAnalytics(UUID contestId, UUID requesterId);

    UserDashboardResponse getUserDashboard(UUID userId);

    void updateProblemStats(SubmissionCompletedEvent event);
}
