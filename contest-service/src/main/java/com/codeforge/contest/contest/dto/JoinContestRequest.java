package com.codeforge.contest.contest.dto;

import jakarta.validation.constraints.NotBlank;

public record JoinContestRequest(
        @NotBlank
        String inviteCode
) {}
