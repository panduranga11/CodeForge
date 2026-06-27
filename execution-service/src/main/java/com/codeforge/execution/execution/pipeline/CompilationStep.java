package com.codeforge.execution.execution.pipeline;

import com.codeforge.execution.execution.executor.CompilationResult;
import com.codeforge.execution.execution.executor.ExecutorFactory;
import com.codeforge.execution.execution.executor.LanguageExecutor;
import com.codeforge.execution.submission.entity.Language;
import com.codeforge.execution.submission.entity.Verdict;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CompilationStep extends ExecutionStep {

    private final ExecutorFactory executorFactory;

    @Override
    protected PipelineContext handle(PipelineContext ctx) {
        Language language = Language.valueOf(ctx.getLanguage());
        LanguageExecutor executor = executorFactory.getExecutor(language);

        CompilationResult result = executor.compile(ctx.getSourceCode(), ctx.getWorkDir());
        ctx.setCompilationResult(result);

        if (!result.isSuccess()) {
            ctx.abort(Verdict.CE, result.getErrorOutput());
        }

        return ctx;
    }
}
