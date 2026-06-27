package com.codeforge.execution.execution.executor;

import com.codeforge.execution.submission.entity.Language;

public interface LanguageExecutor {

    Language getLanguage();

    CompilationResult compile(String sourceCode, String workDir);

    ExecutionResult execute(String workDir, String input, int timeLimitMs, int memoryLimitMB);
}
