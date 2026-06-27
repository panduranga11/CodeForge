package com.codeforge.execution.shared.event;

import java.io.Serializable;
import java.util.UUID;

public record SubmissionCompletedEvent(
        UUID submissionId,
        UUID userId,
        UUID contestId,
        UUID problemId,
        String verdict,
        int score,
        int executionTime
) implements Serializable {}
