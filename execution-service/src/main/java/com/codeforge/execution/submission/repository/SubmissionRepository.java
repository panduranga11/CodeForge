package com.codeforge.execution.submission.repository;

import com.codeforge.execution.submission.entity.Submission;
import com.codeforge.execution.submission.entity.Verdict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    Page<Submission> findByUserId(UUID userId, Pageable pageable);

    Page<Submission> findByUserIdAndContestId(UUID userId, UUID contestId, Pageable pageable);

    Page<Submission> findByContestIdAndProblemId(UUID contestId, UUID problemId, Pageable pageable);

    long countByUserIdAndProblemIdAndSubmittedAtAfter(UUID userId, UUID problemId, LocalDateTime since);

    List<Submission> findByVerdictAndSubmittedAtBefore(Verdict verdict, LocalDateTime cutoff);
}
