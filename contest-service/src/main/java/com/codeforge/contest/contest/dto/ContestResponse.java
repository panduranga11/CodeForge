package com.codeforge.contest.contest.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record ContestResponse(
        UUID id,
        String title,
        String description,
        LocalDateTime startTime,
        LocalDateTime endTime,
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
        LocalDateTime createdAt
) {}
