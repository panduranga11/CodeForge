package com.codeforge.contest.analytics.service;

import com.codeforge.contest.analytics.dto.ContestAnalyticsResponse;
import com.codeforge.contest.analytics.dto.ProblemStatsResponse;
import com.codeforge.contest.analytics.dto.UserDashboardResponse;
import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.repository.ContestParticipantRepository;
import com.codeforge.contest.contest.repository.ContestRepository;
import com.codeforge.contest.problem.entity.Problem;
import com.codeforge.contest.problem.repository.ProblemRepository;
import com.codeforge.contest.shared.exception.ContestNotFoundException;
import com.codeforge.contest.shared.exception.UnauthorizedAccessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class AnalyticsServiceImpl implements AnalyticsService {

    private final ContestRepository contestRepository;
    private final ContestParticipantRepository participantRepository;
    private final ProblemRepository problemRepository;

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
        long contestsParticipated = participantRepository.countByContestId(userId);
        return new UserDashboardResponse(contestsParticipated, 0, 0);
    }
}
