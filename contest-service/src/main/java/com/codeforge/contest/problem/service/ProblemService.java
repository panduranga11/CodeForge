package com.codeforge.contest.problem.service;

import com.codeforge.contest.problem.dto.*;

import java.util.List;
import java.util.UUID;

public interface ProblemService {

    ProblemResponse create(UUID contestId, CreateProblemRequest request, UUID userId);

    ProblemResponse getById(UUID contestId, UUID problemId);

    List<ProblemResponse> listByContest(UUID contestId);

    ProblemResponse update(UUID contestId, UUID problemId, UpdateProblemRequest request, UUID userId);

    TestCaseResponse addTestCase(UUID contestId, UUID problemId, CreateTestCaseRequest request, UUID userId);

    ProblemResponse publish(UUID contestId, UUID problemId, UUID userId);

    void delete(UUID contestId, UUID problemId, UUID userId);
}
