package com.codeforge.contest.leaderboard.service;

import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.entity.ContestParticipant;
import com.codeforge.contest.contest.repository.ContestParticipantRepository;
import com.codeforge.contest.contest.repository.ContestRepository;
import com.codeforge.contest.leaderboard.dto.LeaderboardResponse;
import com.codeforge.contest.leaderboard.entity.Leaderboard;
import com.codeforge.contest.leaderboard.repository.LeaderboardRepository;
import com.codeforge.contest.shared.event.SubmissionCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;


@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardServiceImpl implements LeaderboardService {

    private final LeaderboardRepository leaderboardRepository;
    private final ContestRepository contestRepository;
    private final ContestParticipantRepository participantRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    private static final String LEADERBOARD_KEY = "leaderboard:contest:%s";
    private static final String SCORES_KEY     = "scores:contest:%s";
    private static final String SOLVED_KEY     = "solved:contest:%s:user:%s";

    // 10M seconds > any realistic contest duration, keeps points as the dominant factor
    private static final long TIME_BUCKET = 10_000_000L;

    private String resolveUserName(UUID contestId, UUID userId) {
        return participantRepository.findByContestIdAndUserId(contestId, userId)
                .map(ContestParticipant::getFullName)
                .orElse(userId.toString().substring(0, 8));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<LeaderboardResponse> getContestLeaderboard(UUID contestId, Pageable pageable) {
        String key = String.format(LEADERBOARD_KEY, contestId);
        long start = pageable.getOffset();
        long end = start + pageable.getPageSize() - 1;

        Set<ZSetOperations.TypedTuple<String>> entries =
                redisTemplate.opsForZSet().reverseRangeWithScores(key, start, end);

        if (entries != null && !entries.isEmpty()) {
            return buildFromRedis(contestId, entries, pageable);
        }

        // Fallback to DB
        return leaderboardRepository.findByContestIdOrderByRankAsc(contestId, pageable)
                .map(lb -> new LeaderboardResponse(
                        lb.getRank(), lb.getUserId(), resolveUserName(contestId, lb.getUserId()),
                        lb.getScore(), lb.getPenaltyTime(), lb.getProblemsSolved(), lb.getLastAcTime()
                ));
    }

    @Override
    @Transactional
    public void updateOnSubmission(SubmissionCompletedEvent event) {
        Contest contest = contestRepository.findByIdAndDeletedAtIsNull(event.getContestId())
                .orElse(null);
        if (contest == null) {
            log.warn("Contest {} not found, skipping leaderboard update", event.getContestId());
            return;
        }

        // Load DB entry first — authoritative dedup against Redis eviction / Kafka replay
        Leaderboard entry = leaderboardRepository
                .findByContestIdAndUserId(event.getContestId(), event.getUserId())
                .orElseGet(() -> {
                    Leaderboard newEntry = new Leaderboard();
                    newEntry.setContest(contest);
                    newEntry.setUserId(event.getUserId());
                    newEntry.setRank(0);
                    newEntry.setScore(0);
                    newEntry.setPenaltyTime(0);
                    newEntry.setProblemsSolved(0);
                    return newEntry;
                });

        if (entry.hasAlreadySolved(event.getProblemId())) {
            log.info("DB dedup: user {} already solved problem {} in contest {}, skipping",
                    event.getUserId(), event.getProblemId(), event.getContestId());
            return;
        }

        // Redis fast-path dedup (skips Redis round-trips when key is warm)
        String solvedKey = String.format(SOLVED_KEY, event.getContestId(), event.getUserId());
        Boolean alreadySolved = redisTemplate.opsForSet()
                .isMember(solvedKey, event.getProblemId().toString());

        if (Boolean.TRUE.equals(alreadySolved)) {
            log.info("Redis dedup: user {} already solved problem {} in contest {}, skipping",
                    event.getUserId(), event.getProblemId(), event.getContestId());
            return;
        }

        // Mark as solved in Redis
        redisTemplate.opsForSet().add(solvedKey, event.getProblemId().toString());

        // Composite score: points * TIME_BUCKET - secondsFromContestStart
        // Ensures sorting by points first, then by earliest solve time for ties
        long secondsElapsed = Math.max(0,
                Instant.now().getEpochSecond() - contest.getStartTime().getEpochSecond());

        String leaderboardKey = String.format(LEADERBOARD_KEY, event.getContestId());
        String scoresKey = String.format(SCORES_KEY, event.getContestId());

        if (event.getScore() > 0) {
            long compositeIncrement = (long) event.getScore() * TIME_BUCKET - secondsElapsed;
            redisTemplate.opsForZSet().incrementScore(leaderboardKey, event.getUserId().toString(), compositeIncrement);
        }
        redisTemplate.opsForHash().increment(scoresKey, event.getUserId().toString(), event.getScore());

        // Update PostgreSQL
        entry.addSolvedProblem(event.getProblemId());
        entry.setScore(entry.getScore() + event.getScore());
        entry.setProblemsSolved(entry.getProblemsSolved() + 1);
        entry.setLastAcTime(Instant.now());
        leaderboardRepository.save(entry);

        recalculateRanks(event.getContestId());
        broadcastLeaderboard(event.getContestId());

        log.info("Leaderboard updated: user={} contest={} score={} problemsSolved={}",
                event.getUserId(), event.getContestId(), entry.getScore(), entry.getProblemsSolved());
    }

    private void recalculateRanks(UUID contestId) {
        List<Leaderboard> entries = leaderboardRepository
                .findTop100ByContestIdOrderByRankAsc(contestId);

        entries.sort((a, b) -> {
            if (b.getScore() != a.getScore()) return b.getScore() - a.getScore();
            if (a.getPenaltyTime() != b.getPenaltyTime()) return a.getPenaltyTime() - b.getPenaltyTime();
            if (a.getLastAcTime() != null && b.getLastAcTime() != null) {
                return a.getLastAcTime().compareTo(b.getLastAcTime());
            }
            return 0;
        });

        for (int i = 0; i < entries.size(); i++) {
            entries.get(i).setRank(i + 1);
        }

        leaderboardRepository.saveAll(entries);
    }

    private int actualScore(String scoresKey, String userId) {
        Object val = redisTemplate.opsForHash().get(scoresKey, userId);
        if (val == null) return 0;
        return Integer.parseInt(val.toString());
    }

    private Page<LeaderboardResponse> buildFromRedis(UUID contestId,
                                                      Set<ZSetOperations.TypedTuple<String>> entries,
                                                      Pageable pageable) {
        int rank = (int) pageable.getOffset() + 1;
        List<LeaderboardResponse> results = new ArrayList<>();
        String scoresKey = String.format(SCORES_KEY, contestId);

        for (ZSetOperations.TypedTuple<String> entry : entries) {
            UUID userId = UUID.fromString(entry.getValue());
            int score = actualScore(scoresKey, entry.getValue());

            String solvedKey = String.format(SOLVED_KEY, contestId, userId);
            Long solved = redisTemplate.opsForSet().size(solvedKey);

            results.add(new LeaderboardResponse(
                    rank++, userId, resolveUserName(contestId, userId), score, 0,
                    solved != null ? solved.intValue() : 0, null
            ));
        }

        Long total = redisTemplate.opsForZSet().zCard(String.format(LEADERBOARD_KEY, contestId));
        return new PageImpl<>(results, pageable, total != null ? total : results.size());
    }

    private void broadcastLeaderboard(UUID contestId) {
        String key = String.format(LEADERBOARD_KEY, contestId);
        String scoresKey = String.format(SCORES_KEY, contestId);

        Set<ZSetOperations.TypedTuple<String>> top10 =
                redisTemplate.opsForZSet().reverseRangeWithScores(key, 0, 9);

        if (top10 == null) return;

        int rank = 1;
        List<LeaderboardResponse> results = new ArrayList<>();
        for (ZSetOperations.TypedTuple<String> entry : top10) {
            UUID userId = UUID.fromString(entry.getValue());
            int score = actualScore(scoresKey, entry.getValue());
            String solvedKey = String.format(SOLVED_KEY, contestId, userId);
            Long solved = redisTemplate.opsForSet().size(solvedKey);
            results.add(new LeaderboardResponse(
                    rank++, userId, resolveUserName(contestId, userId), score, 0,
                    solved != null ? solved.intValue() : 0, null
            ));
        }

        messagingTemplate.convertAndSend("/topic/leaderboard/" + contestId, results);
        log.debug("Broadcasted leaderboard update for contest {}", contestId);
    }
}
