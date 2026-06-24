package com.codeforge.contest.problem.dto;

import java.util.UUID;

public record TestCaseResponse(
        UUID id,
        String input,
        String expectedOutput,
        String type,
        int scoreWeight
) {}
