package com.codeforge.execution.submission.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "submission_test_results", indexes = {
        @Index(name = "idx_str_submission_id", columnList = "submission_id")
})
@Getter
@Setter
@NoArgsConstructor
public class SubmissionTestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    @Column(name = "test_case_id", nullable = false)
    private UUID testCaseId;

    @Column(nullable = false)
    private boolean passed;

    @Column(name = "execution_time", nullable = false)
    private int executionTime;

    @Column(name = "memory_used", nullable = false)
    private int memoryUsed;

    @Column(name = "actual_output", columnDefinition = "TEXT")
    private String actualOutput;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onPersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
