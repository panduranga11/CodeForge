package com.codeforge.contest.leaderboard.service;

import com.codeforge.contest.shared.event.SubmissionCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class LeaderboardKafkaConsumer {

    private final LeaderboardService leaderboardService;

    @KafkaListener(topics = "submission.completed", groupId = "leaderboard-group")
    public void onSubmission(SubmissionCompletedEvent event) {
        log.info("Leaderboard consumer received event: submission={} verdict={} user={}",
                event.getSubmissionId(), event.getVerdict(), event.getUserId());

        if (!"AC".equals(event.getVerdict())) {
            log.debug("Ignoring non-AC verdict for submission {}", event.getSubmissionId());
            return;
        }

        leaderboardService.updateOnSubmission(event);
    }
}
