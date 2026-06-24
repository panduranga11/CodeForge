package com.codeforge.contest.leaderboard.service;

import com.codeforge.contest.leaderboard.dto.LeaderboardResponse;
import com.codeforge.contest.leaderboard.repository.LeaderboardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class LeaderboardServiceImpl implements LeaderboardService {

    private final LeaderboardRepository leaderboardRepository;

    @Override
    public Page<LeaderboardResponse> getContestLeaderboard(UUID contestId, Pageable pageable) {
        return leaderboardRepository.findByContestIdOrderByRankAsc(contestId, pageable)
                .map(lb -> new LeaderboardResponse(
                        lb.getRank(),
                        lb.getUserId(),
                        lb.getScore(),
                        lb.getPenaltyTime(),
                        lb.getProblemsSolved(),
                        lb.getLastAcTime()
                ));
    }
}
