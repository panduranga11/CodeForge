package com.codeforge.execution.run.dto;

public record RunResponse(
        boolean compiled,
        String stdout,
        String stderr,
        int executionTimeMs
) {}
