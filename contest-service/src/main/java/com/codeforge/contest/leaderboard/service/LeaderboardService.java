package com.codeforge.contest.leaderboard.service;

import com.codeforge.contest.leaderboard.dto.LeaderboardResponse;
import com.codeforge.contest.shared.event.SubmissionCompletedEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface LeaderboardService {

    Page<LeaderboardResponse> getContestLeaderboard(UUID contestId, Pageable pageable);

    void updateOnSubmission(SubmissionCompletedEvent event);
}
