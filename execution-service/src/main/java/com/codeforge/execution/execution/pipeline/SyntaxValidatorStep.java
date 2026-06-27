package com.codeforge.execution.execution.pipeline;

import com.codeforge.execution.submission.entity.Verdict;
import org.springframework.stereotype.Component;

@Component
public class SyntaxValidatorStep extends ExecutionStep {

    @Override
    protected PipelineContext handle(PipelineContext ctx) {
        String code = ctx.getSourceCode();

        if (code == null || code.isBlank()) {
            ctx.abort(Verdict.CE, "Source code is empty");
            return ctx;
        }

        long open = code.chars().filter(c -> c == '{').count();
        long close = code.chars().filter(c -> c == '}').count();
        if (open != close) {
            ctx.abort(Verdict.CE, "Mismatched braces: " + open + " opening vs " + close + " closing");
            return ctx;
        }

        return ctx;
    }
}
