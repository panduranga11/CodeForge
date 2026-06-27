package com.codeforge.execution.submission.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "submissions", indexes = {
        @Index(name = "idx_submissions_user_id", columnList = "user_id"),
        @Index(name = "idx_submissions_problem_id", columnList = "problem_id"),
        @Index(name = "idx_submissions_contest_id", columnList = "contest_id"),
        @Index(name = "idx_submissions_verdict", columnList = "verdict"),
        @Index(name = "idx_submissions_submitted_at", columnList = "submitted_at")
})
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "problem_id", nullable = false)
    private UUID problemId;

    @Column(name = "contest_id")
    private UUID contestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private Language language;

    @Column(name = "source_code", nullable = false, columnDefinition = "TEXT")
    private String sourceCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Verdict verdict = Verdict.PENDING;

    @Column(name = "execution_time")
    private Integer executionTime;

    @Column(name = "memory_used")
    private Integer memoryUsed;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SubmissionTestResult> testResults = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by", nullable = false, length = 255)
    private String createdBy;

    @PrePersist
    protected void onPersist() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }
}
