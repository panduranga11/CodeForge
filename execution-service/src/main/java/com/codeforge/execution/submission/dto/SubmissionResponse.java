package com.codeforge.execution.submission.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SubmissionResponse(
        UUID id,
        UUID userId,
        UUID problemId,
        UUID contestId,
        String language,
        String verdict,
        Integer executionTime,
        Integer memoryUsed,
        String errorMessage,
        LocalDateTime submittedAt,
        List<TestResultResponse> testResults
) {}
