package com.codeforge.execution.execution.executor;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class DockerSandbox {

    // Cap captured output so a print-bomb can't exhaust service memory
    private static final int MAX_OUTPUT_BYTES = 1024 * 1024; // 1 MB

    public CompilationResult compile(String image, String command, String workDir, int timeoutSeconds) {
        try {
            List<String> dockerCmd = buildBaseCommand(image, workDir, 512, Phase.COMPILE);
            dockerCmd.add("sh");
            dockerCmd.add("-c");
            dockerCmd.add(command);

            log.debug("Docker compile: {}", String.join(" ", dockerCmd));

            ProcessBuilder pb = new ProcessBuilder(dockerCmd).redirectErrorStream(true);
            Process process = pb.start();

            // Consume output on a background thread so a full pipe buffer can
            // never block the process, and a hung compiler can't block us.
            StreamGobbler output = new StreamGobbler(process.getInputStream());
            output.start();

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                output.join(1000);
                return CompilationResult.failed("Compilation timed out");
            }
            output.join(5000);

            if (process.exitValue() != 0) {
                return CompilationResult.failed(output.content());
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
            ensureWorldTraversable(workDir);

            List<String> dockerCmd = buildBaseCommand(image, workDir, memoryLimitMB, Phase.EXECUTE);
            dockerCmd.add("sh");
            dockerCmd.add("-c");
            dockerCmd.add(command);

            log.debug("Docker execute: {}", String.join(" ", dockerCmd));

            ProcessBuilder pb = new ProcessBuilder(dockerCmd).redirectErrorStream(false);
            Process process = pb.start();

            // Start consuming stdout/stderr BEFORE waiting. Waiting first
            // deadlocks once output exceeds the OS pipe buffer (~64KB): the
            // program blocks on write, we block on waitFor, and a correct
            // solution gets a false TLE.
            StreamGobbler stdout = new StreamGobbler(process.getInputStream());
            StreamGobbler stderr = new StreamGobbler(process.getErrorStream());
            stdout.start();
            stderr.start();

            try (OutputStream os = process.getOutputStream()) {
                if (input != null) {
                    os.write(input.getBytes(StandardCharsets.UTF_8));
                }
                os.flush();
            }

            long startTime = System.currentTimeMillis();
            boolean finished = process.waitFor(timeLimitMs + 2000, TimeUnit.MILLISECONDS);
            int elapsed = (int) (System.currentTimeMillis() - startTime);

            if (!finished) {
                process.destroyForcibly();
                stdout.join(1000);
                stderr.join(1000);
                return ExecutionResult.tle(elapsed, 0);
            }

            stdout.join(5000);
            stderr.join(5000);

            int exitCode = process.exitValue();

            if (exitCode == 137) {
                return ExecutionResult.mle(elapsed, memoryLimitMB);
            }

            if (exitCode != 0) {
                return ExecutionResult.runtimeError(stderr.content(), elapsed, 0);
            }

            return ExecutionResult.success(stdout.content().trim(), elapsed, 0);
        } catch (Exception e) {
            log.error("Docker execution failed: {}", e.getMessage());
            return ExecutionResult.runtimeError(e.getMessage(), 0, 0);
        }
    }

    private enum Phase { COMPILE, EXECUTE }

    private List<String> buildBaseCommand(String image, String workDir,
                                          int memoryLimitMB, Phase phase) {
        List<String> cmd = new ArrayList<>();
        cmd.add("docker");
        cmd.add("run");
        cmd.add("--rm");
        cmd.add("-i");

        // Neither compiling nor running untrusted code needs the network.
        cmd.add("--network=none");

        cmd.add("--memory=" + memoryLimitMB + "m");
        cmd.add("--memory-swap=" + memoryLimitMB + "m");
        cmd.add("--cpus=1");
        cmd.add("--pids-limit=64");
        cmd.add("--cap-drop=ALL");
        cmd.add("--security-opt=no-new-privileges");
        cmd.add("--read-only");
        cmd.add("--tmpfs=/tmp:rw,noexec,nosuid,size=64m");

        cmd.add("-v");
        if (phase == Phase.EXECUTE) {
            // Compiled artifacts only need to be read; submitted code must not
            // be able to write to the host mount, and runs as nobody.
            cmd.add(workDir + ":/code:ro");
            cmd.add("--user=65534:65534");
        } else {
            // Compilers write build outputs into the work dir.
            cmd.add(workDir + ":/code");
        }
        cmd.add("-w");
        cmd.add("/code");

        cmd.add(image);

        return cmd;
    }

    /**
     * The execute phase runs as uid 65534 (nobody). Temp dirs on Linux are
     * created 700, which nobody can't traverse — relax them. No-op on Windows.
     */
    private void ensureWorldTraversable(String workDir) {
        File dir = new File(workDir);
        if (!dir.setReadable(true, false) | !dir.setExecutable(true, false)) {
            log.debug("Could not relax permissions on {} (expected on Windows)", workDir);
        }
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                f.setReadable(true, false);
            }
        }
    }

    /** Reads a stream fully on its own thread, capped at MAX_OUTPUT_BYTES. */
    private static final class StreamGobbler extends Thread {
        private final InputStream stream;
        private final StringBuilder sb = new StringBuilder();
        private volatile boolean truncated = false;

        StreamGobbler(InputStream stream) {
            this.stream = stream;
            setDaemon(true);
        }

        @Override
        public void run() {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (sb.length() < MAX_OUTPUT_BYTES) {
                        sb.append(line).append("\n");
                    } else if (!truncated) {
                        truncated = true;
                        sb.append("... [output truncated]\n");
                        // Keep draining so the process never blocks on a full pipe
                    }
                }
            } catch (IOException ignored) {
                // Stream closes when the process is destroyed — expected on TLE
            }
        }

        String content() {
            return sb.toString();
        }
    }
}
