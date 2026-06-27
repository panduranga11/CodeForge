package com.codeforge.contest.contest.dto;

import java.time.Instant;
import java.util.UUID;

public record ContestResponse(
        UUID id,
        String title,
        String description,
        Instant startTime,
        Instant endTime,
        String status,
        String visibility,
        String regType,
        String scoringMode,
        Integer maxParticipants,
        String inviteCode,
        String inviteLink,
        UUID hostId,
        long participantCount,
        long problemCount,
        Instant createdAt
) {}
