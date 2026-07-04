package com.codeforge.execution.execution.executor;

import com.codeforge.execution.submission.entity.Language;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    private static final Pattern PUBLIC_CLASS = Pattern.compile("public\\s+class\\s+(\\w+)");

    private String extractClassName(String sourceCode) {
        Matcher m = PUBLIC_CLASS.matcher(sourceCode);
        return m.find() ? m.group(1) : "Main";
    }

    @Override
    public CompilationResult compile(String sourceCode, String workDir) {
        try {
            String className = extractClassName(sourceCode);
            Path sourceFile = Path.of(workDir, className + ".java");
            Files.writeString(sourceFile, sourceCode);

            return dockerSandbox.compile(dockerImage, "javac " + className + ".java", workDir, 30);
        } catch (Exception e) {
            log.error("Java compilation error: {}", e.getMessage());
            return CompilationResult.failed(e.getMessage());
        }
    }

    @Override
    public ExecutionResult execute(String workDir, String input, int timeLimitMs, int memoryLimitMB) {
        // Re-extract class name to find the correct entry point
        try {
            String className = Files.list(Path.of(workDir))
                    .filter(p -> p.toString().endsWith(".java"))
                    .findFirst()
                    .map(p -> p.getFileName().toString().replace(".java", ""))
                    .orElse("Main");
            String command = "java -Xmx" + memoryLimitMB + "m " + className;
            return dockerSandbox.execute(dockerImage, command, workDir, input, timeLimitMs, memoryLimitMB);
        } catch (Exception e) {
            log.error("Java execution error: {}", e.getMessage());
            return ExecutionResult.runtimeError(e.getMessage(), 0, 0);
        }
    }
}
