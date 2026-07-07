package com.codeforge.execution.submission.service;

import com.codeforge.execution.shared.client.ContestServiceClient;
import com.codeforge.execution.shared.config.ExecutionProperties;
import com.codeforge.execution.shared.config.RabbitMQConfig;
import com.codeforge.execution.shared.exception.*;
import com.codeforge.execution.shared.response.ApiResponse;
import com.codeforge.execution.submission.dto.*;
import com.codeforge.execution.submission.entity.Language;
import com.codeforge.execution.submission.entity.Submission;
import com.codeforge.execution.submission.entity.Verdict;
import com.codeforge.execution.submission.mapper.SubmissionMapper;
import com.codeforge.execution.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class SubmissionServiceImpl implements SubmissionService {

    private final SubmissionRepository submissionRepo;
    private final SubmissionMapper submissionMapper;
    private final RabbitTemplate rabbitTemplate;
    private final ContestServiceClient contestClient;
    private final ExecutionProperties execProps;
    private final StringRedisTemplate redisTemplate;

    private static final String RATE_LIMIT_KEY = "ratelimit:sub:%s:%s";

    @Override
    public SubmissionResponse submit(CreateSubmissionRequest request, UUID userId) {
        Language language = parseLanguage(request.language());

        checkRateLimit(userId, request.problemId());

        int timeLimitMs;
        int memoryLimitMB;
        int points;
        List<TestCaseDto> testCases;

        if (request.contestId() != null) {
            validateContestActive(request.contestId());
            validateParticipant(request.contestId(), userId);

            Map<String, Object> problem = fetchProblem(request.contestId(), request.problemId(), userId);
            int baseTimeMs = ((Number) problem.get("timeLimit")).intValue() * 1000;
            int baseMemoryMB = ((Number) problem.get("memoryLimit")).intValue();
            points = ((Number) problem.get("points")).intValue();

            ExecutionProperties.LanguageLimits langLimits = execProps.getLanguages()
                    .getOrDefault(language.name(), new ExecutionProperties.LanguageLimits(1.0, 1.0));
            timeLimitMs = (int) (baseTimeMs * langLimits.getTimeMultiplier());
            memoryLimitMB = (int) (baseMemoryMB * langLimits.getMemoryMultiplier());

            testCases = fetchTestCases(request.contestId(), request.problemId(), userId);
        } else {
            timeLimitMs = 2000;
            memoryLimitMB = 256;
            points = 0;
            testCases = List.of();
        }

        Submission submission = new Submission();
        submission.setUserId(userId);
        submission.setProblemId(request.problemId());
        submission.setContestId(request.contestId());
        submission.setLanguage(language);
        submission.setSourceCode(request.sourceCode());
        submission.setVerdict(Verdict.PENDING);
        submission.setCreatedBy(userId.toString());
        submissionRepo.save(submission);

        SubmissionMessage message = new SubmissionMessage(
                submission.getId(),
                request.sourceCode(),
                language.name(),
                testCases,
                timeLimitMs,
                memoryLimitMB,
                userId,
                request.contestId(),
                request.problemId(),
                points
        );

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE,
                RabbitMQConfig.ROUTING_KEY,
                message
        );

        log.info("Submission {} queued for user {} on problem {}",
                submission.getId(), userId, request.problemId());

        return submissionMapper.toResponse(submission);
    }

    @Override
    @Transactional(readOnly = true)
    public SubmissionResponse getById(UUID submissionId, UUID requesterId) {
        Submission submission = submissionRepo.findById(submissionId)
                .orElseThrow(SubmissionNotFoundException::new);
        return submissionMapper.toResponse(submission);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SubmissionResponse> list(UUID userId, UUID contestId, Pageable pageable) {
        Page<Submission> page;
        if (contestId != null) {
            page = submissionRepo.findByUserIdAndContestId(userId, contestId, pageable);
        } else {
            page = submissionRepo.findByUserId(userId, pageable);
        }
        return page.map(submissionMapper::toResponse);
    }

    private Language parseLanguage(String language) {
        try {
            return Language.valueOf(language.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new UnsupportedLanguageException(language);
        }
    }

    private void checkRateLimit(UUID userId, UUID problemId) {
        String key = String.format(RATE_LIMIT_KEY, userId, problemId);
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofMinutes(execProps.getRateLimitWindowMinutes()));
            }
            if (count != null && count > execProps.getRateLimit()) {
                throw new RateLimitExceededException();
            }
        } catch (RateLimitExceededException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Redis rate limit check failed, falling back to DB: {}", e.getMessage());
            long count = submissionRepo.countByUserIdAndProblemIdAndSubmittedAtAfter(
                    userId, problemId, java.time.LocalDateTime.now().minusMinutes(execProps.getRateLimitWindowMinutes()));
            if (count >= execProps.getRateLimit()) {
                throw new RateLimitExceededException();
            }
        }
    }

    private void validateContestActive(UUID contestId) {
        try {
            ApiResponse<Map<String, Object>> response = contestClient.getContest(contestId);
            String status = (String) response.getData().get("status");
            if (!"ACTIVE".equals(status)) {
                throw new ContestNotActiveException();
            }
        } catch (ContestNotActiveException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to validate contest {}: {}", contestId, e.getMessage());
            throw new ContestNotActiveException();
        }
    }

    private void validateParticipant(UUID contestId, UUID userId) {
        try {
            contestClient.checkParticipant(contestId, userId);
        } catch (Exception e) {
            log.error("Participant validation failed for user {} in contest {}: {}",
                    userId, contestId, e.getMessage());
            throw new NotAParticipantException();
        }
    }

    private Map<String, Object> fetchProblem(UUID contestId, UUID problemId, UUID userId) {
        ApiResponse<Map<String, Object>> response = contestClient.getProblem(contestId, problemId, userId);
        return response.getData();
    }

    private List<TestCaseDto> fetchTestCases(UUID contestId, UUID problemId, UUID userId) {
        ApiResponse<List<TestCaseDto>> response = contestClient.getTestCases(contestId, problemId, "HIDDEN", userId, true);
        List<TestCaseDto> testCases = response.getData();
        if (testCases == null || testCases.isEmpty()) {
            throw new IllegalStateException("No test cases found for problem " + problemId
                    + " in contest " + contestId + " — grading aborted");
        }
        return testCases;
    }
}
