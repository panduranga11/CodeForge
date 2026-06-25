package com.codeforge.contest.leaderboard.controller;

import com.codeforge.contest.leaderboard.dto.LeaderboardResponse;
import com.codeforge.contest.leaderboard.service.LeaderboardService;
import com.codeforge.contest.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/contest/v1/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping("/contest/{contestId}")
    public ResponseEntity<ApiResponse<Page<LeaderboardResponse>>> getContestLeaderboard(
            @PathVariable UUID contestId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<LeaderboardResponse> response = leaderboardService.getContestLeaderboard(
                contestId, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
