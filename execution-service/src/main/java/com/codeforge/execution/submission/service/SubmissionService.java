package com.codeforge.execution.submission.service;

import com.codeforge.execution.submission.dto.CreateSubmissionRequest;
import com.codeforge.execution.submission.dto.SubmissionResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface SubmissionService {

    SubmissionResponse submit(CreateSubmissionRequest request, UUID userId);

    SubmissionResponse getById(UUID submissionId, UUID requesterId);

    Page<SubmissionResponse> list(UUID userId, UUID contestId, Pageable pageable);
}
