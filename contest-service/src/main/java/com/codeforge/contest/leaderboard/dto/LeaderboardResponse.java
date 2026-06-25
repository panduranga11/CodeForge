package com.codeforge.contest.leaderboard.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record LeaderboardResponse(
        int rank,
        UUID userId,
        int score,
        int penaltyTime,
        int problemsSolved,
        LocalDateTime lastAcTime
) {}
