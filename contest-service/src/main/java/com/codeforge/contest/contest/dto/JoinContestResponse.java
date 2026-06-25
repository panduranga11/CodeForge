package com.codeforge.contest.contest.dto;

import java.util.UUID;

public record JoinContestResponse(
        UUID contestId,
        String contestTitle,
        String message
) {}
