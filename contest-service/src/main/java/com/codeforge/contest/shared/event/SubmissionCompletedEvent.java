package com.codeforge.contest.shared.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SubmissionCompletedEvent {

    private UUID submissionId;
    private UUID userId;
    private UUID contestId;
    private UUID problemId;
    private String verdict;
    private int score;
    private int executionTime;
}
