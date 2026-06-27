package com.codeforge.contest.contest.controller;

import com.codeforge.contest.contest.dto.*;
import com.codeforge.contest.contest.service.ContestService;
import com.codeforge.contest.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/contest/v1/contests")
@RequiredArgsConstructor
public class ContestController {

    private final ContestService contestService;

    @PostMapping
    public ResponseEntity<ApiResponse<ContestResponse>> create(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateContestRequest request) {
        ContestResponse response = contestService.create(request, userId);
        return ResponseEntity.status(201)
                .body(ApiResponse.success("Contest created", response));
    }

    @PostMapping("/host")
    public ResponseEntity<ApiResponse<ContestResponse>> host(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateContestRequest request) {
        ContestResponse response = contestService.create(request, userId);
        return ResponseEntity.status(201)
                .body(ApiResponse.success("Contest hosted", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ContestResponse>> getById(@PathVariable UUID id) {
        ContestResponse response = contestService.getById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ContestResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ContestResponse> response = contestService.list(
                PageRequest.of(page, size, Sort.by("startTime").descending()));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/explore")
    public ResponseEntity<ApiResponse<Page<ContestResponse>>> explore(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<ContestResponse> response = contestService.explore(
                PageRequest.of(page, size, Sort.by("startTime").descending()));
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/join/{inviteCode}")
    public ResponseEntity<ApiResponse<ContestResponse>> getByInviteCode(
            @PathVariable String inviteCode) {
        ContestResponse response = contestService.getByInviteCode(inviteCode);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{id}/schedule")
    public ResponseEntity<ApiResponse<ContestResponse>> schedule(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId) {
        ContestResponse response = contestService.schedule(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Contest scheduled", response));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<ContestResponse>> cancel(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId) {
        ContestResponse response = contestService.cancel(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Contest cancelled", response));
    }

    @PostMapping("/{id}/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId) {
        contestService.register(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Registered for contest", null));
    }

    @PostMapping("/join")
    public ResponseEntity<ApiResponse<JoinContestResponse>> join(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody JoinContestRequest request) {
        JoinContestResponse response = contestService.join(request, userId);
        return ResponseEntity.ok(ApiResponse.success("Joined contest", response));
    }

    @GetMapping("/{id}/participants/{userId}")
    public ResponseEntity<ApiResponse<Boolean>> checkParticipant(
            @PathVariable UUID id,
            @PathVariable UUID userId) {
        boolean exists = contestService.isParticipant(id, userId);
        if (!exists) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Not a participant", "NOT_A_PARTICIPANT"));
        }
        return ResponseEntity.ok(ApiResponse.success(true));
    }
}
