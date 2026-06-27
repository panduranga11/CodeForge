package com.codeforge.contest.analytics.service;

import com.codeforge.contest.shared.event.SubmissionCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsKafkaConsumer {

    private final AnalyticsService analyticsService;

    @KafkaListener(topics = "submission.completed", groupId = "analytics-group")
    public void onSubmission(SubmissionCompletedEvent event) {
        log.info("Analytics consumer received event: submission={} verdict={}",
                event.getSubmissionId(), event.getVerdict());
        analyticsService.updateProblemStats(event);
    }
}
