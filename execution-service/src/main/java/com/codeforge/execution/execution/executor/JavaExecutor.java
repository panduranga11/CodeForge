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
public class JavaExecutor implements LanguageExecutor {

    private final DockerSandbox dockerSandbox;

    @Value("${app.execution.docker.images.java:codeforge/java-runner}")
    private String dockerImage;

    @Override
    public Language getLanguage() {
        return Language.JAVA;
    }

    @Override
    public CompilationResult compile(String sourceCode, String workDir) {
        try {
            Path sourceFile = Path.of(workDir, "Main.java");
            Files.writeString(sourceFile, sourceCode);

            return dockerSandbox.compile(dockerImage, "javac Main.java", workDir, 30);
        } catch (Exception e) {
            log.error("Java compilation error: {}", e.getMessage());
            return CompilationResult.failed(e.getMessage());
        }
    }

    @Override
    public ExecutionResult execute(String workDir, String input, int timeLimitMs, int memoryLimitMB) {
        String command = "java -Xmx" + memoryLimitMB + "m Main";
        return dockerSandbox.execute(dockerImage, command, workDir, input, timeLimitMs, memoryLimitMB);
    }
}
