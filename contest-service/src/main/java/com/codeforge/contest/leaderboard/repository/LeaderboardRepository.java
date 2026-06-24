package com.codeforge.contest.leaderboard.repository;

import com.codeforge.contest.leaderboard.entity.Leaderboard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeaderboardRepository extends JpaRepository<Leaderboard, UUID> {

    Optional<Leaderboard> findByContestIdAndUserId(UUID contestId, UUID userId);

    Page<Leaderboard> findByContestIdOrderByRankAsc(UUID contestId, Pageable pageable);

    List<Leaderboard> findTop100ByContestIdOrderByRankAsc(UUID contestId);

    void deleteByContestId(UUID contestId);
}
