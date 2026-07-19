package com.codeforge.execution.execution.worker;

import com.codeforge.execution.execution.pipeline.PipelineContext;
import com.codeforge.execution.submission.dto.SubmissionMessage;
import com.codeforge.execution.submission.entity.Submission;
import com.codeforge.execution.submission.entity.SubmissionTestResult;
import com.codeforge.execution.submission.entity.Verdict;
import com.codeforge.execution.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * DB writes for the execution worker, kept in their own bean so the
 * transaction covers ONLY persistence — not the multi-second Docker runs.
 * (A @Transactional listener would pin a connection-pool slot per in-flight
 * submission for the entire sandbox execution.)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExecutionResultPersister {

    private final SubmissionRepository submissionRepo;

    /**
     * @return false if the submission was already graded (message redelivery) —
     *         callers must then skip event publishing too.
     */
    @Transactional
    public boolean persistResult(SubmissionMessage msg, PipelineContext ctx) {
        Submission submission = submissionRepo.findById(msg.submissionId()).orElse(null);
        if (submission == null) {
            log.error("Submission {} not found in DB", msg.submissionId());
            return false;
        }

        // Idempotency: a redelivered message must not re-grade or duplicate
        // test results.
        if (submission.getVerdict() != Verdict.PENDING) {
            log.warn("Submission {} already graded ({}), skipping duplicate delivery",
                    msg.submissionId(), submission.getVerdict());
            return false;
        }

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
        return true;
    }

    @Transactional
    public void markFailed(UUID submissionId, String error) {
        submissionRepo.findById(submissionId).ifPresent(s -> {
            if (s.getVerdict() != Verdict.PENDING) {
                return;
            }
            s.setVerdict(Verdict.RE);
            s.setErrorMessage("Execution failed: " + error);
            submissionRepo.save(s);
        });
    }
}
