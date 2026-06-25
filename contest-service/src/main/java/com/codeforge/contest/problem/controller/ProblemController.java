package com.codeforge.contest.problem.controller;

import com.codeforge.contest.problem.dto.*;
import com.codeforge.contest.problem.service.ProblemService;
import com.codeforge.contest.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/contest/v1/contests/{contestId}/problems")
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProblemResponse>> create(
            @PathVariable UUID contestId,
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateProblemRequest request) {
        ProblemResponse response = problemService.create(contestId, request, userId);
        return ResponseEntity.status(201)
                .body(ApiResponse.success("Problem created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProblemResponse>>> listByContest(
            @PathVariable UUID contestId) {
        List<ProblemResponse> response = problemService.listByContest(contestId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{problemId}")
    public ResponseEntity<ApiResponse<ProblemResponse>> getById(
            @PathVariable UUID contestId,
            @PathVariable UUID problemId) {
        ProblemResponse response = problemService.getById(contestId, problemId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{problemId}")
    public ResponseEntity<ApiResponse<ProblemResponse>> update(
            @PathVariable UUID contestId,
            @PathVariable UUID problemId,
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody UpdateProblemRequest request) {
        ProblemResponse response = problemService.update(contestId, problemId, request, userId);
        return ResponseEntity.ok(ApiResponse.success("Problem updated", response));
    }

    @PostMapping("/{problemId}/testcases")
    public ResponseEntity<ApiResponse<TestCaseResponse>> addTestCase(
            @PathVariable UUID contestId,
            @PathVariable UUID problemId,
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateTestCaseRequest request) {
        TestCaseResponse response = problemService.addTestCase(contestId, problemId, request, userId);
        return ResponseEntity.status(201)
                .body(ApiResponse.success("Test case added", response));
    }

    @PatchMapping("/{problemId}/publish")
    public ResponseEntity<ApiResponse<ProblemResponse>> publish(
            @PathVariable UUID contestId,
            @PathVariable UUID problemId,
            @RequestHeader("X-User-Id") UUID userId) {
        ProblemResponse response = problemService.publish(contestId, problemId, userId);
        return ResponseEntity.ok(ApiResponse.success("Problem published", response));
    }

    @DeleteMapping("/{problemId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID contestId,
            @PathVariable UUID problemId,
            @RequestHeader("X-User-Id") UUID userId) {
        problemService.delete(contestId, problemId, userId);
        return ResponseEntity.ok(ApiResponse.success("Problem deleted", null));
    }
}
