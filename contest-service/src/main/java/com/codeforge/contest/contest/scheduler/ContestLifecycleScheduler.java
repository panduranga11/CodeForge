package com.codeforge.contest.contest.scheduler;

import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.entity.ContestStatus;
import com.codeforge.contest.contest.repository.ContestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ContestLifecycleScheduler {

    private final ContestRepository contestRepository;

    @Scheduled(fixedRate = 10000)
    @Transactional
    public void transitionContests() {
        Instant now = Instant.now();

        List<Contest> toActivate = contestRepository
                .findByStatusAndStartTimeBefore(ContestStatus.SCHEDULED, now);
        for (Contest contest : toActivate) {
            contest.setStatus(ContestStatus.ACTIVE);
            contestRepository.save(contest);
            log.info("Contest auto-activated id={} title={}", contest.getId(), contest.getTitle());
        }

        List<Contest> toComplete = contestRepository
                .findByStatusAndEndTimeBefore(ContestStatus.ACTIVE, now);
        for (Contest contest : toComplete) {
            contest.setStatus(ContestStatus.COMPLETED);
            contestRepository.save(contest);
            log.info("Contest auto-completed id={} title={}", contest.getId(), contest.getTitle());
        }
    }
}
