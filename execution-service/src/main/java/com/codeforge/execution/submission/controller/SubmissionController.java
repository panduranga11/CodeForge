package com.codeforge.execution.submission.controller;

import com.codeforge.execution.shared.response.ApiResponse;
import com.codeforge.execution.submission.dto.CreateSubmissionRequest;
import com.codeforge.execution.submission.dto.SubmissionResponse;
import com.codeforge.execution.submission.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/exec/v1/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping
    public ResponseEntity<ApiResponse<SubmissionResponse>> submit(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateSubmissionRequest request) {
        SubmissionResponse response = submissionService.submit(request, userId);
        return ResponseEntity.status(202)
                .body(ApiResponse.success("Submission accepted", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubmissionResponse>> getById(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId) {
        SubmissionResponse response = submissionService.getById(id, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    private static final int MAX_PAGE_SIZE = 100;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<SubmissionResponse>>> list(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) UUID contestId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int cappedSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<SubmissionResponse> response = submissionService.list(
                userId, contestId,
                PageRequest.of(page, cappedSize, Sort.by("submittedAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
