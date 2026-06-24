package com.codeforge.contest.problem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTestCaseRequest(
        @NotBlank
        String input,

        @NotBlank
        String expectedOutput,

        @NotNull
        String type,

        int scoreWeight
) {}
