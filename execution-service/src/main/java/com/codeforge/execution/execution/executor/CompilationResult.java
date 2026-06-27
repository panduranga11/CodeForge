package com.codeforge.execution.execution.executor;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CompilationResult {

    private final boolean success;
    private final String errorOutput;

    public static CompilationResult ok() {
        return new CompilationResult(true, null);
    }

    public static CompilationResult skipped() {
        return new CompilationResult(true, null);
    }

    public static CompilationResult failed(String error) {
        return new CompilationResult(false, error);
    }
}
