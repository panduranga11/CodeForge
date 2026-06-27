package com.codeforge.contest.problem.service;

import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.entity.ContestStatus;
import com.codeforge.contest.contest.repository.ContestRepository;
import com.codeforge.contest.problem.dto.*;
import com.codeforge.contest.problem.entity.*;
import com.codeforge.contest.problem.mapper.ProblemMapper;
import com.codeforge.contest.problem.repository.ProblemRepository;
import com.codeforge.contest.problem.repository.TestCaseRepository;
import com.codeforge.contest.shared.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ProblemServiceImpl implements ProblemService {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final ContestRepository contestRepository;
    private final ProblemMapper problemMapper;

    @Override
    public ProblemResponse create(UUID contestId, CreateProblemRequest request, UUID userId) {
        Contest contest = findContestAndVerifyHost(contestId, userId);
        verifyContestEditable(contest);

        if (problemRepository.existsByTitleAndContestId(request.title(), contestId)) {
            throw new DuplicateProblemTitleException(request.title());
        }

        Problem problem = new Problem();
        problem.setContest(contest);
        problem.setTitle(request.title());
        problem.setDescription(request.description());
        problem.setDifficulty(Difficulty.valueOf(request.difficulty()));
        problem.setCategory(ProblemCategory.valueOf(request.category()));
        problem.setTimeLimit(request.timeLimit());
        problem.setMemoryLimit(request.memoryLimit());
        problem.setInputFormat(request.inputFormat());
        problem.setOutputFormat(request.outputFormat());
        problem.setConstraintsText(request.constraintsText());
        problem.setExplanation(request.explanation());
        problem.setTags(request.tags());
        problem.setPoints(request.points());
        problem.setSequenceNo(request.sequenceNo());
        problem.setStatus(ProblemStatus.DRAFT);
        problem.setCreatedBy(userId);

        problem = problemRepository.save(problem);
        log.info("Problem created id={} in contest={}", problem.getId(), contestId);
        return problemMapper.toResponse(problem);
    }

    @Override
    @Transactional(readOnly = true)
    public ProblemResponse getById(UUID contestId, UUID problemId) {
        Problem problem = findProblemInContest(contestId, problemId);
        return problemMapper.toResponse(problem);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProblemResponse> listByContest(UUID contestId) {
        return problemRepository.findByContestIdAndDeletedAtIsNullOrderBySequenceNo(contestId)
                .stream()
                .map(problemMapper::toResponse)
                .toList();
    }

    @Override
    public ProblemResponse update(UUID contestId, UUID problemId, UpdateProblemRequest request, UUID userId) {
        findContestAndVerifyHost(contestId, userId);
        Problem problem = findProblemInContest(contestId, problemId);

        if (request.title() != null) problem.setTitle(request.title());
        if (request.description() != null) problem.setDescription(request.description());
        if (request.difficulty() != null) problem.setDifficulty(Difficulty.valueOf(request.difficulty()));
        if (request.category() != null) problem.setCategory(ProblemCategory.valueOf(request.category()));
        if (request.timeLimit() != null) problem.setTimeLimit(request.timeLimit());
        if (request.memoryLimit() != null) problem.setMemoryLimit(request.memoryLimit());
        if (request.inputFormat() != null) problem.setInputFormat(request.inputFormat());
        if (request.outputFormat() != null) problem.setOutputFormat(request.outputFormat());
        if (request.constraintsText() != null) problem.setConstraintsText(request.constraintsText());
        if (request.explanation() != null) problem.setExplanation(request.explanation());
        if (request.tags() != null) problem.setTags(request.tags());
        if (request.points() != null) problem.setPoints(request.points());
        if (request.sequenceNo() != null) problem.setSequenceNo(request.sequenceNo());

        problem = problemRepository.save(problem);
        log.info("Problem updated id={} in contest={}", problemId, contestId);
        return problemMapper.toResponse(problem);
    }

    @Override
    public TestCaseResponse addTestCase(UUID contestId, UUID problemId, CreateTestCaseRequest request, UUID userId) {
        findContestAndVerifyHost(contestId, userId);
        Problem problem = findProblemInContest(contestId, problemId);

        TestCase testCase = new TestCase();
        testCase.setProblem(problem);
        testCase.setInput(request.input());
        testCase.setExpectedOutput(request.expectedOutput());
        testCase.setType(TestCaseType.valueOf(request.type()));
        testCase.setScoreWeight(request.scoreWeight());
        testCase = testCaseRepository.save(testCase);

        log.info("Test case added id={} to problem={}", testCase.getId(), problemId);
        return problemMapper.toTestCaseResponse(testCase);
    }

    @Override
    public ProblemResponse publish(UUID contestId, UUID problemId, UUID userId) {
        findContestAndVerifyHost(contestId, userId);
        Problem problem = findProblemInContest(contestId, problemId);

        if (problem.getStatus() == ProblemStatus.PUBLISHED) {
            throw new InvalidContestStateException("Problem is already published");
        }

        long hiddenCount = testCaseRepository.countByProblemIdAndType(problemId, TestCaseType.HIDDEN);
        if (hiddenCount == 0) {
            throw new InvalidContestStateException("At least 1 hidden test case required to publish");
        }

        problem.setStatus(ProblemStatus.PUBLISHED);
        problem = problemRepository.save(problem);
        log.info("Problem published id={} in contest={}", problemId, contestId);
        return problemMapper.toResponse(problem);
    }

    @Override
    public void delete(UUID contestId, UUID problemId, UUID userId) {
        findContestAndVerifyHost(contestId, userId);
        Problem problem = findProblemInContest(contestId, problemId);
        problem.setDeletedAt(Instant.now());
        problemRepository.save(problem);
        log.info("Problem soft-deleted id={} in contest={}", problemId, contestId);
    }

    private Contest findContestAndVerifyHost(UUID contestId, UUID userId) {
        Contest contest = contestRepository.findByIdAndDeletedAtIsNull(contestId)
                .orElseThrow(() -> new ContestNotFoundException(contestId));
        if (!contest.getHostId().equals(userId)) {
            throw new UnauthorizedAccessException("Only the contest host can manage problems");
        }
        return contest;
    }

    private void verifyContestEditable(Contest contest) {
        if (contest.getStatus() == ContestStatus.ACTIVE || contest.getStatus() == ContestStatus.COMPLETED) {
            throw new InvalidContestStateException("Cannot modify problems in ACTIVE or COMPLETED contest");
        }
    }

    private Problem findProblemInContest(UUID contestId, UUID problemId) {
        return problemRepository.findByIdAndContestIdAndDeletedAtIsNull(problemId, contestId)
                .orElseThrow(() -> new ProblemNotFoundException(problemId));
    }
}
