package com.codeforge.contest.contest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CreateContestRequest(
        @NotBlank @Size(min = 5, max = 200)
        String title,

        @NotBlank @Size(max = 5000)
        String description,

        @NotNull
        LocalDateTime startTime,

        @NotNull
        LocalDateTime endTime,

        @NotNull
        String visibility,

        @NotNull
        String regType,

        @NotNull
        String scoringMode,

        Integer maxParticipants
) {}
