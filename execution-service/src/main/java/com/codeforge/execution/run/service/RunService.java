package com.codeforge.execution.run.service;

import com.codeforge.execution.execution.executor.CompilationResult;
import com.codeforge.execution.execution.executor.ExecutionResult;
import com.codeforge.execution.execution.executor.ExecutorFactory;
import com.codeforge.execution.execution.executor.LanguageExecutor;
import com.codeforge.execution.execution.pipeline.PipelineContext;
import com.codeforge.execution.execution.pipeline.SecurityValidatorStep;
import com.codeforge.execution.execution.pipeline.SyntaxValidatorStep;
import com.codeforge.execution.run.dto.RunRequest;
import com.codeforge.execution.run.dto.RunResponse;
import com.codeforge.execution.shared.exception.RateLimitExceededException;
import com.codeforge.execution.submission.entity.Language;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class RunService {

    private static final int RUN_TIME_LIMIT_MS = 10_000;
    private static final int RUN_MEMORY_LIMIT_MB = 256;
    private static final int RUN_RATE_LIMIT = 30;
    private static final String RUN_RATE_LIMIT_KEY = "ratelimit:run:%s";

    private final ExecutorFactory executorFactory;
    private final SyntaxValidatorStep syntaxValidator;
    private final SecurityValidatorStep securityValidator;
    private final StringRedisTemplate redisTemplate;

    public RunResponse run(RunRequest request, String userId) {
        checkRunRateLimit(userId);

        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("run-");
            Language language = Language.valueOf(request.language());
            LanguageExecutor executor = executorFactory.getExecutor(language);

            PipelineContext validationCtx = new PipelineContext();
            validationCtx.setSourceCode(request.sourceCode());
            validationCtx.setLanguage(language.name());
            validationCtx.setTestCases(List.of());
            syntaxValidator.validateOnly(validationCtx);
            if (!validationCtx.isAborted()) {
                securityValidator.validateOnly(validationCtx);
            }
            if (validationCtx.isAborted()) {
                return new RunResponse(false, null, validationCtx.getErrorMessage(), 0);
            }

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

    private void checkRunRateLimit(String userId) {
        String key = String.format(RUN_RATE_LIMIT_KEY, userId);
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(1));
            }
            if (count != null && count > RUN_RATE_LIMIT) {
                throw new RateLimitExceededException();
            }
        } catch (RateLimitExceededException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis rate limit check failed for run, proceeding: {}", e.getMessage());
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
