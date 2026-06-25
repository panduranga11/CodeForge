package com.codeforge.contest.contest.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "contest_participants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_contest_participant",
                columnNames = {"contest_id", "user_id"}),
        indexes = @Index(name = "idx_contest_participants_contest", columnList = "contest_id"))
@Getter
@Setter
@NoArgsConstructor
public class ContestParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    private Contest contest;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "registered_at", nullable = false)
    private LocalDateTime registeredAt;

    @PrePersist
    protected void onPersist() {
        if (registeredAt == null) {
            registeredAt = LocalDateTime.now();
        }
    }
}
