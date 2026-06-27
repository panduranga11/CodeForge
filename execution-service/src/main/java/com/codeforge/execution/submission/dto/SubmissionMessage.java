package com.codeforge.execution.submission.dto;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;

public record SubmissionMessage(
        UUID submissionId,
        String sourceCode,
        String language,
        List<TestCaseDto> testCases,
        int timeLimitMs,
        int memoryLimitMB,
        UUID userId,
        UUID contestId,
        UUID problemId,
        int points
) implements Serializable {}
