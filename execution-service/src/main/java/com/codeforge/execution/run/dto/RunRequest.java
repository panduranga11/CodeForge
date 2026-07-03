package com.codeforge.execution.run.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RunRequest(
        @NotNull String language,
        @NotBlank @Size(max = 50000) String sourceCode,
        @Size(max = 10000) String customInput
) {}
