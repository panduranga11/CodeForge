package com.codeforge.execution.execution.pipeline;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PipelineConfig {

    @Bean
    public ExecutionStep executionPipeline(SyntaxValidatorStep sv,
                                           SecurityValidatorStep secv,
                                           CompilationStep cs,
                                           TestCaseExecutionStep ts,
                                           VerdictStep vs) {
        sv.then(secv).then(cs).then(ts).then(vs);
        return sv;
    }
}
