package com.codeforge.execution.shared.client;

import com.codeforge.execution.shared.response.ApiResponse;
import com.codeforge.execution.submission.dto.TestCaseDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "CONTEST-SERVICE")
public interface ContestServiceClient {

    @GetMapping("/contest/v1/contests/{contestId}")
    ApiResponse<Map<String, Object>> getContest(@PathVariable UUID contestId);

    @GetMapping("/contest/v1/contests/{contestId}/participants/{userId}")
    ApiResponse<Boolean> checkParticipant(@PathVariable UUID contestId, @PathVariable UUID userId);

    @GetMapping("/contest/v1/contests/{contestId}/problems/{problemId}")
    ApiResponse<Map<String, Object>> getProblem(@PathVariable UUID contestId, @PathVariable UUID problemId);

    @GetMapping("/contest/v1/contests/{contestId}/problems/{problemId}/testcases")
    ApiResponse<List<TestCaseDto>> getTestCases(@PathVariable UUID contestId, @PathVariable UUID problemId,
                                                 @RequestParam("type") String type);
}
