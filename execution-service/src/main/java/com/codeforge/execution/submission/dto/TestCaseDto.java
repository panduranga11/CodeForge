package com.codeforge.execution.submission.dto;

import java.util.UUID;

public record TestCaseDto(
        UUID id,
        String input,
        String expectedOutput,
        int scoreWeight
) {}
