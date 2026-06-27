package com.codeforge.execution.execution.pipeline;

import com.codeforge.execution.execution.executor.ExecutionResult;
import com.codeforge.execution.execution.executor.ExecutorFactory;
import com.codeforge.execution.execution.executor.LanguageExecutor;
import com.codeforge.execution.submission.dto.TestCaseDto;
import com.codeforge.execution.submission.entity.Language;
import com.codeforge.execution.submission.entity.Verdict;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class TestCaseExecutionStep extends ExecutionStep {

    private final ExecutorFactory executorFactory;

    @Override
    protected PipelineContext handle(PipelineContext ctx) {
        Language language = Language.valueOf(ctx.getLanguage());
        LanguageExecutor executor = executorFactory.getExecutor(language);

        for (TestCaseDto tc : ctx.getTestCases()) {
            ExecutionResult er = executor.execute(
                    ctx.getWorkDir(), tc.input(),
                    ctx.getTimeLimitMs(), ctx.getMemoryLimitMB());

            PipelineContext.TestResult tr = new PipelineContext.TestResult();
            tr.setTestCaseId(tc.id());
            tr.setExecutionTimeMs(er.getExecutionTimeMs());
            tr.setMemoryUsedMB(er.getMemoryUsedMB());
            tr.setActualOutput(er.getOutput());

            if (er.isTimedOut()) {
                tr.setPassed(false);
                tr.setVerdict(Verdict.TLE);
            } else if (er.isMemoryExceeded()) {
                tr.setPassed(false);
                tr.setVerdict(Verdict.MLE);
            } else if (er.isRuntimeError()) {
                tr.setPassed(false);
                tr.setVerdict(Verdict.RE);
            } else {
                String expected = tc.expectedOutput().trim();
                String actual = er.getOutput() != null ? er.getOutput().trim() : "";
                boolean passed = expected.equals(actual);
                tr.setPassed(passed);
                tr.setVerdict(passed ? Verdict.AC : Verdict.WA);
            }

            ctx.addTestResult(tr);
        }

        return ctx;
    }
}
