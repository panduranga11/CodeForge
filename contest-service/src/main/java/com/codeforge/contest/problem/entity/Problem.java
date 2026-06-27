package com.codeforge.contest.problem.entity;

import com.codeforge.contest.contest.entity.Contest;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "problems", indexes = {
        @Index(name = "idx_problems_contest_id", columnList = "contest_id"),
        @Index(name = "idx_problems_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    private Contest contest;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Difficulty difficulty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProblemCategory category;

    @Column(name = "time_limit", nullable = false)
    private int timeLimit;

    @Column(name = "memory_limit", nullable = false)
    private int memoryLimit;

    @Column(name = "input_format", nullable = false, length = 2000)
    private String inputFormat;

    @Column(name = "output_format", nullable = false, length = 2000)
    private String outputFormat;

    @Column(name = "constraints_text", nullable = false, length = 2000)
    private String constraintsText;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(length = 500)
    private String tags;

    @Column(nullable = false)
    private int points;

    @Column(name = "sequence_no", nullable = false)
    private int sequenceNo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ProblemStatus status = ProblemStatus.DRAFT;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestCase> testCases = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
