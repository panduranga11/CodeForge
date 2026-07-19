package com.codeforge.execution.execution.worker;

import com.codeforge.execution.execution.pipeline.ExecutionStep;
import com.codeforge.execution.execution.pipeline.PipelineContext;
import com.codeforge.execution.shared.config.KafkaConfig;
import com.codeforge.execution.shared.config.RabbitMQConfig;
import com.codeforge.execution.shared.event.SubmissionCompletedEvent;
import com.codeforge.execution.submission.dto.SubmissionMessage;
import com.codeforge.execution.submission.entity.Verdict;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionWorker {

    private final ExecutionStep executionPipeline;
    private final ExecutionResultPersister persister;
    private final KafkaTemplate<String, SubmissionCompletedEvent> kafkaTemplate;

    // Deliberately NOT @Transactional: the pipeline runs Docker containers for
    // seconds at a time, and a transaction here would pin a connection-pool
    // slot per in-flight submission. Persistence is transactional inside
    // ExecutionResultPersister.
    @RabbitListener(queues = RabbitMQConfig.SUBMISSION_QUEUE)
    public void processSubmission(SubmissionMessage msg) {
        log.info("Processing submission {}", msg.submissionId());

        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("exec-" + msg.submissionId());

            PipelineContext ctx = new PipelineContext();
            ctx.setSubmissionId(msg.submissionId());
            ctx.setSourceCode(msg.sourceCode());
            ctx.setLanguage(msg.language());
            ctx.setTestCases(msg.testCases());
            ctx.setTimeLimitMs(msg.timeLimitMs());
            ctx.setMemoryLimitMB(msg.memoryLimitMB());
            ctx.setWorkDir(workDir.toString());

            ctx = executionPipeline.process(ctx);

            boolean persisted = persister.persistResult(msg, ctx);
            if (persisted) {
                publishEvent(msg, ctx);
            }

            log.info("Submission {} completed with verdict {}",
                    msg.submissionId(), ctx.getFinalVerdict());

        } catch (Exception e) {
            log.error("Failed to process submission {}: {}", msg.submissionId(), e.getMessage(), e);
            persister.markFailed(msg.submissionId(), e.getMessage());
            throw new RuntimeException(e);
        } finally {
            cleanupWorkDir(workDir);
        }
    }

    private void publishEvent(SubmissionMessage msg, PipelineContext ctx) {
        if (msg.contestId() == null) return;

        SubmissionCompletedEvent event = new SubmissionCompletedEvent(
                msg.submissionId(),
                msg.userId(),
                msg.contestId(),
                msg.problemId(),
                ctx.getFinalVerdict().name(),
                ctx.getFinalVerdict() == Verdict.AC ? msg.points() : 0,
                ctx.getTestResults().stream()
                        .mapToInt(PipelineContext.TestResult::getExecutionTimeMs)
                        .max().orElse(0)
        );

        kafkaTemplate.send(KafkaConfig.SUBMISSION_COMPLETED_TOPIC,
                msg.submissionId().toString(), event);

        log.info("Published submission.completed event for submission {}", msg.submissionId());
    }

    private void cleanupWorkDir(Path workDir) {
        if (workDir == null) return;
        try {
            Files.walk(workDir)
                    .sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try { Files.deleteIfExists(path); } catch (IOException ignored) {}
                    });
        } catch (IOException e) {
            log.warn("Failed to clean up work directory {}: {}", workDir, e.getMessage());
        }
    }
}
