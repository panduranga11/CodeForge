package com.codeforge.contest.problem.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateProblemRequest(
        @Size(min = 5, max = 200)
        String title,

        @Size(max = 10000)
        String description,

        String difficulty,

        String category,

        @Min(1) @Max(10)
        Integer timeLimit,

        @Min(16) @Max(512)
        Integer memoryLimit,

        @Size(max = 2000)
        String inputFormat,

        @Size(max = 2000)
        String outputFormat,

        @Size(max = 2000)
        String constraintsText,

        String explanation,

        String tags,

        @Min(1)
        Integer points,

        @Min(1)
        Integer sequenceNo
) {}
