package com.codeforge.contest.problem.dto;

import jakarta.validation.constraints.*;

public record CreateProblemRequest(
        @NotBlank @Size(min = 5, max = 200)
        String title,

        @NotBlank @Size(max = 10000)
        String description,

        @NotNull
        String difficulty,

        @NotNull
        String category,

        @Min(1) @Max(10)
        int timeLimit,

        @Min(16) @Max(512)
        int memoryLimit,

        @NotBlank @Size(max = 2000)
        String inputFormat,

        @NotBlank @Size(max = 2000)
        String outputFormat,

        @NotBlank @Size(max = 2000)
        String constraintsText,

        String explanation,

        String tags,

        @Min(1)
        int points,

        @Min(1)
        int sequenceNo
) {}
