package com.codeforge.execution.submission.dto;

import java.util.UUID;

public record TestResultResponse(
        UUID testCaseId,
        boolean passed,
        int executionTime,
        int memoryUsed
) {}
