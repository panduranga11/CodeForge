package com.codeforge.contest.contest.service;

import com.codeforge.contest.contest.dto.*;
import com.codeforge.contest.contest.entity.*;
import com.codeforge.contest.contest.repository.ContestParticipantRepository;
import com.codeforge.contest.contest.repository.ContestRepository;
import com.codeforge.contest.problem.entity.ProblemStatus;
import com.codeforge.contest.problem.repository.ProblemRepository;
import com.codeforge.contest.shared.config.CacheService;
import com.codeforge.contest.shared.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class ContestServiceImpl implements ContestService {

    private static final String INVITE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int INVITE_CODE_LENGTH = 8;
    private static final String INVITE_LINK_BASE = "https://codeforge.io/join/";

    private static final String CONTEST_CACHE_KEY = "contest:%s";
    private static final Duration CONTEST_CACHE_TTL = Duration.ofSeconds(10);

    private final ContestRepository contestRepository;
    private final ContestParticipantRepository participantRepository;
    private final ProblemRepository problemRepository;
    private final CacheService cacheService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public ContestResponse create(CreateContestRequest request, UUID hostId) {
        validateContestTimes(request.startTime(), request.endTime());

        Contest contest = new Contest();
        contest.setTitle(request.title());
        contest.setDescription(request.description());
        contest.setStartTime(request.startTime());
        contest.setEndTime(request.endTime());
        contest.setVisibility(Visibility.valueOf(request.visibility()));
        contest.setRegType(RegType.valueOf(request.regType()));
        contest.setScoringMode(ScoringMode.valueOf(request.scoringMode()));
        contest.setMaxParticipants(request.maxParticipants());
        contest.setHostId(hostId);
        contest.setCreatedBy(hostId);
        contest.setStatus(ContestStatus.DRAFT);
        contest.setInviteCode(generateInviteCode());
        contest.setInviteLink(INVITE_LINK_BASE + contest.getInviteCode());

        contest = contestRepository.save(contest);
        log.info("Contest created id={} by host={}", contest.getId(), hostId);

        ContestResponse response = toResponse(contest);
        cacheContest(contest.getId(), response);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public ContestResponse getById(UUID id) {
        Optional<ContestResponse> cached = cacheService.get(
                String.format(CONTEST_CACHE_KEY, id), ContestResponse.class);
        if (cached.isPresent()) {
            log.debug("Cache hit for contest {}", id);
            return cached.get();
        }

        Contest contest = findContestById(id);
        ContestResponse response = toResponse(contest);
        cacheContest(id, response);
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public ContestResponse getByInviteCode(String inviteCode) {
        Contest contest = contestRepository.findByInviteCode(inviteCode.toUpperCase())
                .orElseThrow(() -> new InvalidInviteCodeException(inviteCode));
        return toResponse(contest);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ContestResponse> list(Pageable pageable) {
        return contestRepository.findByStatusAndVisibilityAndDeletedAtIsNull(
                        ContestStatus.SCHEDULED, Visibility.PUBLIC, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ContestResponse> explore(Pageable pageable) {
        return contestRepository.findByStatusAndVisibilityAndDeletedAtIsNull(
                        ContestStatus.SCHEDULED, Visibility.PUBLIC, pageable)
                .map(this::toResponse);
    }

    @Override
    public ContestResponse schedule(UUID contestId, UUID userId) {
        Contest contest = findContestById(contestId);
        verifyHost(contest, userId);

        if (contest.getStatus() != ContestStatus.DRAFT) {
            throw new InvalidContestStateException("Only DRAFT contests can be scheduled");
        }

        long publishedCount = problemRepository.countByContestIdAndStatusAndDeletedAtIsNull(
                contestId, ProblemStatus.PUBLISHED);
        if (publishedCount == 0) {
            throw new InvalidContestStateException("At least 1 published problem required to schedule");
        }

        validateContestTimes(contest.getStartTime(), contest.getEndTime());
        contest.setStatus(ContestStatus.SCHEDULED);
        contest = contestRepository.save(contest);

        log.info("Contest scheduled id={}", contestId);
        ContestResponse response = toResponse(contest);
        cacheContest(contestId, response);
        return response;
    }

    @Override
    public ContestResponse cancel(UUID contestId, UUID userId) {
        Contest contest = findContestById(contestId);
        verifyHost(contest, userId);

        if (contest.getStatus() == ContestStatus.ACTIVE || contest.getStatus() == ContestStatus.COMPLETED) {
            throw new InvalidContestStateException("Cannot cancel an ACTIVE or COMPLETED contest");
        }

        contest.setStatus(ContestStatus.CANCELLED);
        contest = contestRepository.save(contest);

        log.info("Contest cancelled id={}", contestId);
        evictContestCache(contestId);
        return toResponse(contest);
    }

    @Override
    public void register(UUID contestId, UUID userId) {
        Contest contest = findContestById(contestId);

        if (contest.getStatus() != ContestStatus.SCHEDULED) {
            throw new InvalidContestStateException("Registration only open for SCHEDULED contests");
        }

        if (participantRepository.existsByContestIdAndUserId(contestId, userId)) {
            throw new AlreadyRegisteredException();
        }

        if (contest.getMaxParticipants() != null) {
            long count = participantRepository.countByContestId(contestId);
            if (count >= contest.getMaxParticipants()) {
                throw new ContestFullException();
            }
        }

        ContestParticipant participant = new ContestParticipant();
        participant.setContest(contest);
        participant.setUserId(userId);
        participantRepository.save(participant);

        evictContestCache(contestId);
        log.info("User {} registered for contest {}", userId, contestId);
    }

    @Override
    public JoinContestResponse join(JoinContestRequest request, UUID userId) {
        Contest contest = contestRepository.findByInviteCode(request.inviteCode().toUpperCase())
                .orElseThrow(() -> new InvalidInviteCodeException(request.inviteCode()));

        register(contest.getId(), userId);

        return new JoinContestResponse(contest.getId(), contest.getTitle(), "Successfully joined contest");
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isParticipant(UUID contestId, UUID userId) {
        return participantRepository.existsByContestIdAndUserId(contestId, userId);
    }

    @Override
    public void activate(UUID contestId) {
        Contest contest = findContestById(contestId);
        contest.setStatus(ContestStatus.ACTIVE);
        contestRepository.save(contest);
        evictContestCache(contestId);
        log.info("Contest activated id={}", contestId);
    }

    @Override
    public void complete(UUID contestId) {
        Contest contest = findContestById(contestId);
        contest.setStatus(ContestStatus.COMPLETED);
        contestRepository.save(contest);
        evictContestCache(contestId);
        log.info("Contest completed id={}", contestId);
    }

    private Contest findContestById(UUID id) {
        return contestRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ContestNotFoundException(id));
    }

    private void verifyHost(Contest contest, UUID userId) {
        if (!contest.getHostId().equals(userId)) {
            throw new UnauthorizedAccessException("Only the contest host can perform this action");
        }
    }

    private void validateContestTimes(Instant startTime, Instant endTime) {
        if (startTime.isBefore(Instant.now().plus(Duration.ofMinutes(2)))) {
            throw new InvalidContestStateException("Start time must be at least 2 minutes in the future");
        }
        if (endTime.isBefore(startTime.plus(Duration.ofMinutes(15)))) {
            throw new InvalidContestStateException("Contest duration must be at least 15 minutes");
        }
    }

    private String generateInviteCode() {
        StringBuilder sb = new StringBuilder(INVITE_CODE_LENGTH);
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            sb.append(INVITE_CHARS.charAt(secureRandom.nextInt(INVITE_CHARS.length())));
        }
        return sb.toString();
    }

    private void cacheContest(UUID contestId, ContestResponse response) {
        cacheService.put(String.format(CONTEST_CACHE_KEY, contestId), response, CONTEST_CACHE_TTL);
    }

    private void evictContestCache(UUID contestId) {
        cacheService.evict(String.format(CONTEST_CACHE_KEY, contestId));
    }

    private ContestResponse toResponse(Contest contest) {
        long participantCount = participantRepository.countByContestId(contest.getId());
        long problemCount = problemRepository.countByContestIdAndDeletedAtIsNull(contest.getId());

        return new ContestResponse(
                contest.getId(),
                contest.getTitle(),
                contest.getDescription(),
                contest.getStartTime(),
                contest.getEndTime(),
                contest.getStatus().name(),
                contest.getVisibility().name(),
                contest.getRegType().name(),
                contest.getScoringMode().name(),
                contest.getMaxParticipants(),
                contest.getInviteCode(),
                contest.getInviteLink(),
                contest.getHostId(),
                participantCount,
                problemCount,
                contest.getCreatedAt()
        );
    }
}
