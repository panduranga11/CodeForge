package com.codeforge.execution.execution.worker;

import com.codeforge.execution.execution.pipeline.ExecutionStep;
import com.codeforge.execution.execution.pipeline.PipelineContext;
import com.codeforge.execution.shared.config.KafkaConfig;
import com.codeforge.execution.shared.config.RabbitMQConfig;
import com.codeforge.execution.shared.event.SubmissionCompletedEvent;
import com.codeforge.execution.submission.dto.SubmissionMessage;
import com.codeforge.execution.submission.entity.Submission;
import com.codeforge.execution.submission.entity.SubmissionTestResult;
import com.codeforge.execution.submission.entity.Verdict;
import com.codeforge.execution.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionWorker {

    private final ExecutionStep executionPipeline;
    private final SubmissionRepository submissionRepo;
    private final KafkaTemplate<String, SubmissionCompletedEvent> kafkaTemplate;

    @RabbitListener(queues = RabbitMQConfig.SUBMISSION_QUEUE)
    @Transactional
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

            updateSubmission(msg, ctx);

            publishEvent(msg, ctx);

            log.info("Submission {} completed with verdict {}",
                    msg.submissionId(), ctx.getFinalVerdict());

        } catch (Exception e) {
            log.error("Failed to process submission {}: {}", msg.submissionId(), e.getMessage(), e);
            markFailed(msg.submissionId(), e.getMessage());
            throw new RuntimeException(e);
        } finally {
            cleanupWorkDir(workDir);
        }
    }

    private void updateSubmission(SubmissionMessage msg, PipelineContext ctx) {
        Optional<Submission> opt = submissionRepo.findById(msg.submissionId());
        if (opt.isEmpty()) {
            log.error("Submission {} not found in DB", msg.submissionId());
            return;
        }

        Submission submission = opt.get();
        submission.setVerdict(ctx.getFinalVerdict());
        submission.setErrorMessage(ctx.getErrorMessage());

        int maxTime = 0;
        int maxMemory = 0;

        for (PipelineContext.TestResult tr : ctx.getTestResults()) {
            SubmissionTestResult str = new SubmissionTestResult();
            str.setSubmission(submission);
            str.setTestCaseId(tr.getTestCaseId());
            str.setPassed(tr.isPassed());
            str.setExecutionTime(tr.getExecutionTimeMs());
            str.setMemoryUsed(tr.getMemoryUsedMB());
            str.setActualOutput(tr.getActualOutput());
            submission.getTestResults().add(str);

            maxTime = Math.max(maxTime, tr.getExecutionTimeMs());
            maxMemory = Math.max(maxMemory, tr.getMemoryUsedMB());
        }

        submission.setExecutionTime(maxTime);
        submission.setMemoryUsed(maxMemory);
        submissionRepo.save(submission);
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

    private void markFailed(java.util.UUID submissionId, String error) {
        submissionRepo.findById(submissionId).ifPresent(s -> {
            s.setVerdict(Verdict.RE);
            s.setErrorMessage("Execution failed: " + error);
            submissionRepo.save(s);
        });
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
