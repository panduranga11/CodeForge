package com.codeforge.execution.execution.pipeline;

import com.codeforge.execution.execution.executor.CompilationResult;
import com.codeforge.execution.submission.dto.TestCaseDto;
import com.codeforge.execution.submission.entity.Verdict;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class PipelineContext {

    private UUID submissionId;
    private String sourceCode;
    private String language;
    private List<TestCaseDto> testCases;
    private int timeLimitMs;
    private int memoryLimitMB;
    private String workDir;

    private CompilationResult compilationResult;
    private List<TestResult> testResults = new ArrayList<>();
    private Verdict finalVerdict;
    private String errorMessage;
    private boolean aborted;

    public void abort(Verdict verdict, String errorMessage) {
        this.finalVerdict = verdict;
        this.errorMessage = errorMessage;
        this.aborted = true;
    }

    public void addTestResult(TestResult result) {
        testResults.add(result);
    }

    @Getter
    @Setter
    public static class TestResult {
        private UUID testCaseId;
        private boolean passed;
        private int executionTimeMs;
        private int memoryUsedMB;
        private String actualOutput;
        private Verdict verdict;
    }
}
