package com.codeforge.execution.execution.executor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class DockerSandbox {

    public CompilationResult compile(String image, String command, String workDir, int timeoutSeconds) {
        try {
            List<String> dockerCmd = buildBaseCommand(image, workDir, 512, false);
            dockerCmd.add("sh");
            dockerCmd.add("-c");
            dockerCmd.add(command);

            log.debug("Docker compile: {}", String.join(" ", dockerCmd));

            ProcessBuilder pb = new ProcessBuilder(dockerCmd).redirectErrorStream(true);
            Process process = pb.start();
            String output = readStream(process.getInputStream());
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                return CompilationResult.failed("Compilation timed out");
            }

            if (process.exitValue() != 0) {
                return CompilationResult.failed(output);
            }

            return CompilationResult.ok();
        } catch (Exception e) {
            log.error("Docker compilation failed: {}", e.getMessage());
            return CompilationResult.failed(e.getMessage());
        }
    }

    public ExecutionResult execute(String image, String command, String workDir,
                                   String input, int timeLimitMs, int memoryLimitMB) {
        try {
            List<String> dockerCmd = buildBaseCommand(image, workDir, memoryLimitMB, true);
            dockerCmd.add("sh");
            dockerCmd.add("-c");
            dockerCmd.add(command);

            log.debug("Docker execute: {}", String.join(" ", dockerCmd));

            ProcessBuilder pb = new ProcessBuilder(dockerCmd).redirectErrorStream(false);
            Process process = pb.start();

            try (OutputStream os = process.getOutputStream()) {
                if (input != null) {
                    os.write(input.getBytes());
                }
                os.flush();
            }

            long startTime = System.currentTimeMillis();
            boolean finished = process.waitFor(timeLimitMs + 2000, TimeUnit.MILLISECONDS);
            int elapsed = (int) (System.currentTimeMillis() - startTime);

            if (!finished) {
                process.destroyForcibly();
                return ExecutionResult.tle(elapsed, 0);
            }

            String stdout = readStream(process.getInputStream());
            String stderr = readStream(process.getErrorStream());

            int exitCode = process.exitValue();

            if (exitCode == 137) {
                return ExecutionResult.mle(elapsed, memoryLimitMB);
            }

            if (exitCode != 0) {
                return ExecutionResult.runtimeError(stderr, elapsed, 0);
            }

            return ExecutionResult.success(stdout.trim(), elapsed, 0);
        } catch (Exception e) {
            log.error("Docker execution failed: {}", e.getMessage());
            return ExecutionResult.runtimeError(e.getMessage(), 0, 0);
        }
    }

    private List<String> buildBaseCommand(String image, String workDir,
                                          int memoryLimitMB, boolean networkDisabled) {
        List<String> cmd = new ArrayList<>();
        cmd.add("docker");
        cmd.add("run");
        cmd.add("--rm");
        cmd.add("-i");

        if (networkDisabled) {
            cmd.add("--network=none");
        }

        cmd.add("--memory=" + memoryLimitMB + "m");
        cmd.add("--memory-swap=" + memoryLimitMB + "m");
        cmd.add("--cpus=1");
        cmd.add("--pids-limit=64");
        cmd.add("--security-opt=no-new-privileges");
        cmd.add("--read-only");
        cmd.add("--tmpfs=/tmp:rw,noexec,nosuid,size=64m");

        cmd.add("-v");
        cmd.add(workDir + ":/code");
        cmd.add("-w");
        cmd.add("/code");

        cmd.add(image);

        return cmd;
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
