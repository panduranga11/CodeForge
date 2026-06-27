package com.codeforge.contest.leaderboard.entity;

import com.codeforge.contest.contest.entity.Contest;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "leaderboard",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_leaderboard_contest_user",
                columnNames = {"contest_id", "user_id"}),
        indexes = @Index(name = "idx_leaderboard_contest_rank", columnList = "contest_id, rank"))
@Getter
@Setter
@NoArgsConstructor
public class Leaderboard {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    private Contest contest;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private int rank;

    @Column(nullable = false)
    private int score;

    @Column(name = "penalty_time")
    private int penaltyTime;

    @Column(name = "problems_solved")
    private int problemsSolved;

    @Column(name = "last_ac_time")
    private Instant lastAcTime;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }
}
