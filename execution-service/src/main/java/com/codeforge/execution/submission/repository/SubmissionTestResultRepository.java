package com.codeforge.execution.submission.repository;

import com.codeforge.execution.submission.entity.SubmissionTestResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubmissionTestResultRepository extends JpaRepository<SubmissionTestResult, UUID> {

    List<SubmissionTestResult> findBySubmissionId(UUID submissionId);
}
