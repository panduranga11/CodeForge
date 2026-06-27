package com.codeforge.execution.execution.worker;

import com.codeforge.execution.submission.entity.Submission;
import com.codeforge.execution.submission.entity.Verdict;
import com.codeforge.execution.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaleSubmissionSweeper {

    private final SubmissionRepository submissionRepo;

    private static final int STALE_THRESHOLD_MINUTES = 5;

    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void markStaleSubmissions() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(STALE_THRESHOLD_MINUTES);
        List<Submission> stale = submissionRepo.findByVerdictAndSubmittedAtBefore(
                Verdict.PENDING, cutoff);

        if (stale.isEmpty()) return;

        for (Submission s : stale) {
            s.setVerdict(Verdict.RE);
            s.setErrorMessage("Execution timed out — submission was pending for over "
                    + STALE_THRESHOLD_MINUTES + " minutes");
        }

        submissionRepo.saveAll(stale);
        log.warn("Marked {} stale submissions as FAILED", stale.size());
    }
}
