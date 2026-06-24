package com.codeforge.contest.problem.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ProblemResponse(
        UUID id,
        UUID contestId,
        String title,
        String description,
        String difficulty,
        String category,
        int timeLimit,
        int memoryLimit,
        String inputFormat,
        String outputFormat,
        String constraintsText,
        String explanation,
        String tags,
        int points,
        int sequenceNo,
        String status,
        List<TestCaseResponse> sampleTestCases,
        LocalDateTime createdAt
) {}
