package com.codeforge.execution.execution.pipeline;

import com.codeforge.execution.submission.entity.Verdict;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;

/**
 * Fast-feedback string blacklist. This is NOT the security boundary — string
 * matching is trivially bypassed (string concatenation, reflection, encodings).
 * The actual isolation is the Docker sandbox (no network, cap-drop, non-root,
 * read-only fs, memory/pids limits). This step just gives users an instant CE
 * for obvious cases instead of burning a sandbox run.
 */
@Component
public class SecurityValidatorStep extends ExecutionStep {

    private static final Map<String, Set<String>> BANNED_PATTERNS = Map.of(
            "JAVA", Set.of(
                    "Runtime.getRuntime", "ProcessBuilder", "System.exit",
                    "java.lang.reflect", "java.net.Socket", "java.net.URL",
                    "java.net.HttpURLConnection", "java.net.ServerSocket",
                    "java.io.File", "java.io.FileWriter", "java.io.FileReader",
                    "java.io.FileOutputStream", "java.io.FileInputStream",
                    "java.nio.file", "ClassLoader",
                    "SecurityManager", "System.getenv", "System.getProperty"
            ),
            "PYTHON", Set.of(
                    "os.system", "os.popen", "os.exec", "os.spawn", "os.kill",
                    "os.remove", "os.unlink", "os.rmdir", "os.rename",
                    "subprocess", "__import__",
                    "eval(", "exec(", "compile(",
                    "open(", "shutil", "socket",
                    "importlib", "ctypes", "signal",
                    "multiprocessing", "threading"
            ),
            "CPP", Set.of(
                    "system(", "popen(", "exec(", "fork(", "execvp(",
                    "fopen(", "freopen(", "remove(", "rename(",
                    "socket(", "connect(", "bind(", "listen(",
                    "#include <thread>", "#include <fstream>",
                    "asm(", "__asm__"
            ),
            "JAVASCRIPT", Set.of(
                    "child_process", "require('fs')", "require(\"fs\")",
                    "require('net')", "require(\"net\")",
                    "require('http')", "require(\"http\")",
                    "require('https')", "require(\"https\")",
                    "require('os')", "require(\"os\")",
                    "require('path')", "require(\"path\")",
                    "process.exit", "process.env", "process.kill",
                    "eval(", "Function("
            )
    );

    public void validateOnly(PipelineContext ctx) {
        handle(ctx);
    }

    @Override
    protected PipelineContext handle(PipelineContext ctx) {
        Set<String> banned = BANNED_PATTERNS.getOrDefault(ctx.getLanguage(), Set.of());

        for (String pattern : banned) {
            if (ctx.getSourceCode().contains(pattern)) {
                ctx.abort(Verdict.CE, "Forbidden operation: " + pattern);
                return ctx;
            }
        }

        return ctx;
    }
}
