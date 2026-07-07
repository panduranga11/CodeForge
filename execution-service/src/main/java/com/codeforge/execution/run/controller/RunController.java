package com.codeforge.execution.run.controller;

import com.codeforge.execution.run.dto.RunRequest;
import com.codeforge.execution.run.dto.RunResponse;
import com.codeforge.execution.run.service.RunService;
import com.codeforge.execution.shared.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/exec/v1/run")
@RequiredArgsConstructor
public class RunController {

    private final RunService runService;

    @PostMapping
    public ResponseEntity<ApiResponse<RunResponse>> run(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody RunRequest request) {
        RunResponse result = runService.run(request, userId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
