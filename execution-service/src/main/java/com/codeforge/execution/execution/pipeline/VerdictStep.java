package com.codeforge.execution.execution.pipeline;

import com.codeforge.execution.submission.entity.Verdict;
import org.springframework.stereotype.Component;

@Component
public class VerdictStep extends ExecutionStep {

    private String verdictLabel(Verdict v) {
        return switch (v) {
            case WA -> "Wrong answer";
            case TLE -> "Time limit exceeded";
            case MLE -> "Memory limit exceeded";
            case RE -> "Runtime error";
            default -> v.name();
        };
    }

    @Override
    protected PipelineContext handle(PipelineContext ctx) {
        if (ctx.getTestResults().isEmpty()) {
            ctx.abort(Verdict.RE, "Internal error: no test cases were executed");
            return ctx;
        }

        for (PipelineContext.TestResult tr : ctx.getTestResults()) {
            if (tr.getVerdict() != Verdict.AC) {
                ctx.setFinalVerdict(tr.getVerdict());
                ctx.setErrorMessage(verdictLabel(tr.getVerdict()) + " on hidden test case");
                return ctx;
            }
        }

        ctx.setFinalVerdict(Verdict.AC);
        return ctx;
    }
}
