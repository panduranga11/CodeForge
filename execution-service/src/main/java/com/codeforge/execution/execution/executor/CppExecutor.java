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
public class CppExecutor implements LanguageExecutor {

    private final DockerSandbox dockerSandbox;

    @Value("${app.execution.docker.images.cpp:codeforge/cpp-runner}")
    private String dockerImage;

    @Override
    public Language getLanguage() {
        return Language.CPP;
    }

    @Override
    public CompilationResult compile(String sourceCode, String workDir) {
        try {
            Path sourceFile = Path.of(workDir, "main.cpp");
            Files.writeString(sourceFile, sourceCode);

            return dockerSandbox.compile(dockerImage, "g++ -O2 -o main main.cpp", workDir, 30);
        } catch (Exception e) {
            log.error("C++ compilation error: {}", e.getMessage());
            return CompilationResult.failed(e.getMessage());
        }
    }

    @Override
    public ExecutionResult execute(String workDir, String input, int timeLimitMs, int memoryLimitMB) {
        return dockerSandbox.execute(dockerImage, "./main", workDir, input, timeLimitMs, memoryLimitMB);
    }
}
