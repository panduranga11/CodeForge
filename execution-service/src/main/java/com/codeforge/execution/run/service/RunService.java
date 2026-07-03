package com.codeforge.execution.run.service;

import com.codeforge.execution.execution.executor.CompilationResult;
import com.codeforge.execution.execution.executor.ExecutionResult;
import com.codeforge.execution.execution.executor.ExecutorFactory;
import com.codeforge.execution.execution.executor.LanguageExecutor;
import com.codeforge.execution.run.dto.RunRequest;
import com.codeforge.execution.run.dto.RunResponse;
import com.codeforge.execution.submission.entity.Language;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
@Slf4j
public class RunService {

    private static final int RUN_TIME_LIMIT_MS = 10_000;
    private static final int RUN_MEMORY_LIMIT_MB = 256;

    private final ExecutorFactory executorFactory;

    public RunResponse run(RunRequest request) {
        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("run-");
            Language language = Language.valueOf(request.language());
            LanguageExecutor executor = executorFactory.getExecutor(language);

            CompilationResult compilation = executor.compile(request.sourceCode(), workDir.toString());
            if (!compilation.isSuccess()) {
                return new RunResponse(false, null, compilation.getErrorOutput(), 0);
            }

            String input = request.customInput() != null ? request.customInput() : "";
            ExecutionResult result = executor.execute(workDir.toString(), input, RUN_TIME_LIMIT_MS, RUN_MEMORY_LIMIT_MB);

            String stderr = result.getErrorMessage();
            if (result.isTimedOut()) stderr = "Time Limit Exceeded (10s)";
            else if (result.isMemoryExceeded()) stderr = "Memory Limit Exceeded (256MB)";

            return new RunResponse(true, result.getOutput(), stderr, result.getExecutionTimeMs());

        } catch (Exception e) {
            log.error("Run failed: {}", e.getMessage());
            return new RunResponse(false, null, e.getMessage(), 0);
        } finally {
            cleanupWorkDir(workDir);
        }
    }

    private void cleanupWorkDir(Path workDir) {
        if (workDir == null) return;
        try {
            Files.walk(workDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(p -> { try { Files.deleteIfExists(p); } catch (IOException ignored) {} });
        } catch (IOException e) {
            log.warn("Failed to clean run work dir {}: {}", workDir, e.getMessage());
        }
    }
}
