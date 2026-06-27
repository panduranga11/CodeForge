package com.codeforge.execution.submission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateSubmissionRequest(
        @NotNull UUID problemId,
        UUID contestId,
        @NotNull String language,
        @NotBlank @Size(max = 50000) String sourceCode
) {}
