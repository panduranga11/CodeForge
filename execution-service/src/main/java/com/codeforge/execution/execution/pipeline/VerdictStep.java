package com.codeforge.execution.execution.pipeline;

import com.codeforge.execution.submission.entity.Verdict;
import org.springframework.stereotype.Component;

@Component
public class VerdictStep extends ExecutionStep {

    @Override
    protected PipelineContext handle(PipelineContext ctx) {
        if (ctx.getTestResults().isEmpty()) {
            ctx.setFinalVerdict(Verdict.AC);
            return ctx;
        }

        for (PipelineContext.TestResult tr : ctx.getTestResults()) {
            if (tr.getVerdict() != Verdict.AC) {
                ctx.setFinalVerdict(tr.getVerdict());
                ctx.setErrorMessage(tr.getVerdict().name() + " on test case " + tr.getTestCaseId());
                return ctx;
            }
        }

        ctx.setFinalVerdict(Verdict.AC);
        return ctx;
    }
}
