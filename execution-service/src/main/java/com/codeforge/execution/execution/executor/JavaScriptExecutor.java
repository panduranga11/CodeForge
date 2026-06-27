package com.codeforge.execution.execution.executor;

import com.codeforge.execution.submission.entity.Language;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

@Component
@Slf4j
@RequiredArgsConstructor
public class JavaScriptExecutor implements LanguageExecutor {

    private final DockerSandbox dockerSandbox;

    @Value("${app.execution.docker.images.javascript:codeforge/js-runner}")
    private String dockerImage;

    @Override
    public Language getLanguage() {
        return Language.JAVASCRIPT;
    }

    @Override
    public CompilationResult compile(String sourceCode, String workDir) {
        try {
            Path sourceFile = Path.of(workDir, "solution.js");
            Files.writeString(sourceFile, sourceCode);
            return CompilationResult.skipped();
        } catch (Exception e) {
            return CompilationResult.failed(e.getMessage());
        }
    }

    @Override
    public ExecutionResult execute(String workDir, String input, int timeLimitMs, int memoryLimitMB) {
        return dockerSandbox.execute(dockerImage, "node solution.js", workDir, input, timeLimitMs, memoryLimitMB);
    }
}
