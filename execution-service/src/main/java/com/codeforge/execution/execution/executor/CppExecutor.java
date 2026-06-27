package com.codeforge.execution.execution.executor;

import com.codeforge.execution.submission.entity.Language;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class CppExecutor implements LanguageExecutor {

    @Override
    public Language getLanguage() {
        return Language.CPP;
    }

    @Override
    public CompilationResult compile(String sourceCode, String workDir) {
        try {
            Path sourceFile = Path.of(workDir, "main.cpp");
            Files.writeString(sourceFile, sourceCode);

            ProcessBuilder pb = new ProcessBuilder("g++", "-O2", "-o", "main", "main.cpp")
                    .directory(new File(workDir))
                    .redirectErrorStream(true);
            Process process = pb.start();
            String output = readStream(process.getInputStream());
            boolean finished = process.waitFor(30, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return CompilationResult.failed("Compilation timed out");
            }

            if (process.exitValue() != 0) {
                return CompilationResult.failed(output);
            }

            return CompilationResult.ok();
        } catch (Exception e) {
            log.error("C++ compilation error: {}", e.getMessage());
            return CompilationResult.failed(e.getMessage());
        }
    }

    @Override
    public ExecutionResult execute(String workDir, String input, int timeLimitMs, int memoryLimitMB) {
        try {
            ProcessBuilder pb = new ProcessBuilder("./main")
                    .directory(new File(workDir))
                    .redirectErrorStream(false);
            Process process = pb.start();

            try (OutputStream os = process.getOutputStream()) {
                os.write(input.getBytes());
                os.flush();
            }

            long startTime = System.currentTimeMillis();
            boolean finished = process.waitFor(timeLimitMs, TimeUnit.MILLISECONDS);
            int elapsed = (int) (System.currentTimeMillis() - startTime);

            if (!finished) {
                process.destroyForcibly();
                return ExecutionResult.tle(elapsed, 0);
            }

            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());

            if (process.exitValue() != 0) {
                return ExecutionResult.runtimeError(stderr, elapsed, 0);
            }

            return ExecutionResult.success(stdout.trim(), elapsed, 0);
        } catch (Exception e) {
            log.error("C++ execution error: {}", e.getMessage());
            return ExecutionResult.runtimeError(e.getMessage(), 0, 0);
        }
    }

    private String readStream(InputStream stream) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
            return sb.toString();
        }
    }
}
