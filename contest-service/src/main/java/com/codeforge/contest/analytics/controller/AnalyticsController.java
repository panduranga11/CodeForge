package com.codeforge.contest.analytics.controller;

import com.codeforge.contest.analytics.dto.ContestAnalyticsResponse;
import com.codeforge.contest.analytics.dto.UserDashboardResponse;
import com.codeforge.contest.analytics.service.AnalyticsService;
import com.codeforge.contest.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/contest/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/contest/{contestId}")
    public ResponseEntity<ApiResponse<ContestAnalyticsResponse>> getContestAnalytics(
            @PathVariable UUID contestId,
            @RequestHeader("X-User-Id") UUID userId) {
        ContestAnalyticsResponse response = analyticsService.getContestAnalytics(contestId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/user/dashboard")
    public ResponseEntity<ApiResponse<UserDashboardResponse>> getUserDashboard(
            @RequestHeader("X-User-Id") UUID userId) {
        UserDashboardResponse response = analyticsService.getUserDashboard(userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
