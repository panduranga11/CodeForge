package com.codeforge.contest.analytics.service;

import com.codeforge.contest.analytics.dto.ContestAnalyticsResponse;
import com.codeforge.contest.analytics.dto.ProblemStatsResponse;
import com.codeforge.contest.analytics.dto.UserDashboardResponse;
import com.codeforge.contest.analytics.entity.UserStats;
import com.codeforge.contest.analytics.repository.UserStatsRepository;
import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.repository.ContestParticipantRepository;
import com.codeforge.contest.contest.repository.ContestRepository;
import com.codeforge.contest.leaderboard.repository.LeaderboardRepository;
import com.codeforge.contest.problem.entity.Problem;
import com.codeforge.contest.problem.repository.ProblemRepository;
import com.codeforge.contest.shared.config.CacheService;
import com.codeforge.contest.shared.event.SubmissionCompletedEvent;
import com.codeforge.contest.shared.exception.ContestNotFoundException;
import com.codeforge.contest.shared.exception.UnauthorizedAccessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final String DASHBOARD_CACHE_KEY = "user:dashboard:%s";
    private static final Duration DASHBOARD_CACHE_TTL = Duration.ofMinutes(2);

    private final ContestRepository contestRepository;
    private final ContestParticipantRepository participantRepository;
    private final ProblemRepository problemRepository;
    private final LeaderboardRepository leaderboardRepository;
    private final UserStatsRepository userStatsRepository;
    private final CacheService cacheService;

    @Override
    public ContestAnalyticsResponse getContestAnalytics(UUID contestId, UUID requesterId) {
        Contest contest = contestRepository.findByIdAndDeletedAtIsNull(contestId)
                .orElseThrow(() -> new ContestNotFoundException(contestId));

        if (!contest.getHostId().equals(requesterId)) {
            throw new UnauthorizedAccessException("Only the contest host can view analytics");
        }

        long participantCount = participantRepository.countByContestId(contestId);
        List<Problem> problems = problemRepository
                .findByContestIdAndDeletedAtIsNullOrderBySequenceNo(contestId);

        List<ProblemStatsResponse> problemStats = problems.stream()
                .map(p -> new ProblemStatsResponse(
                        p.getId(),
                        p.getTitle(),
                        p.getPoints(),
                        p.getSequenceNo()
                ))
                .toList();

        return new ContestAnalyticsResponse(
                contestId,
                participantCount,
                problems.size(),
                problemStats
        );
    }

    @Override
    public UserDashboardResponse getUserDashboard(UUID userId) {
        Optional<UserDashboardResponse> cached = cacheService.get(
                String.format(DASHBOARD_CACHE_KEY, userId), UserDashboardResponse.class);
        if (cached.isPresent()) {
            log.debug("Cache hit for user dashboard {}", userId);
            return cached.get();
        }

        long contestsParticipated = participantRepository.countByUserId(userId);

        long totalSubmissions = userStatsRepository.findById(userId)
                .map(UserStats::getTotalSubmissions)
                .orElse(0L);

        long problemsSolved = leaderboardRepository.sumProblemsSolvedByUserId(userId);

        UserDashboardResponse response = new UserDashboardResponse(
                contestsParticipated, totalSubmissions, problemsSolved);

        cacheService.put(String.format(DASHBOARD_CACHE_KEY, userId), response, DASHBOARD_CACHE_TTL);
        return response;
    }

    @Override
    @Transactional
    public void updateProblemStats(SubmissionCompletedEvent event) {
        log.info("Analytics: processing submission {} for user {} verdict={}",
                event.getSubmissionId(), event.getUserId(), event.getVerdict());

        cacheService.evict(String.format(DASHBOARD_CACHE_KEY, event.getUserId()));

        UserStats stats = userStatsRepository.findById(event.getUserId())
                .orElseGet(() -> {
                    UserStats s = new UserStats();
                    s.setUserId(event.getUserId());
                    return s;
                });

        stats.setTotalSubmissions(stats.getTotalSubmissions() + 1);
        stats.setUpdatedAt(Instant.now());
        userStatsRepository.save(stats);
    }
}
