package com.codeforge.execution.execution.executor;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ExecutionResult {

    private final String output;
    private final int executionTimeMs;
    private final int memoryUsedMB;
    private final boolean timedOut;
    private final boolean memoryExceeded;
    private final boolean runtimeError;
    private final String errorMessage;

    public static ExecutionResult success(String output, int timeMs, int memoryMB) {
        return new ExecutionResult(output, timeMs, memoryMB, false, false, false, null);
    }

    public static ExecutionResult tle(int timeMs, int memoryMB) {
        return new ExecutionResult(null, timeMs, memoryMB, true, false, false, "Time Limit Exceeded");
    }

    public static ExecutionResult mle(int timeMs, int memoryMB) {
        return new ExecutionResult(null, timeMs, memoryMB, false, true, false, "Memory Limit Exceeded");
    }

    public static ExecutionResult runtimeError(String error, int timeMs, int memoryMB) {
        return new ExecutionResult(null, timeMs, memoryMB, false, false, true, error);
    }
}
