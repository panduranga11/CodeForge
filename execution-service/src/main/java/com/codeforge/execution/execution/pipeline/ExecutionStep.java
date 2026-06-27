package com.codeforge.execution.execution.pipeline;

public abstract class ExecutionStep {

    private ExecutionStep next;

    public ExecutionStep then(ExecutionStep next) {
        this.next = next;
        return next;
    }

    public final PipelineContext process(PipelineContext ctx) {
        ctx = handle(ctx);
        if (!ctx.isAborted() && next != null) {
            return next.process(ctx);
        }
        return ctx;
    }

    protected abstract PipelineContext handle(PipelineContext ctx);
}
