package com.codeforge.contest.leaderboard.dto;

import java.time.Instant;
import java.util.UUID;

public record LeaderboardResponse(
        int rank,
        UUID userId,
        int score,
        int penaltyTime,
        int problemsSolved,
        Instant lastAcTime
) {}
