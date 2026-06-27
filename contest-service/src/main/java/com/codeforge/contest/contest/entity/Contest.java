package com.codeforge.contest.contest.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contests", indexes = {
        @Index(name = "idx_contests_status", columnList = "status"),
        @Index(name = "idx_contests_host_id", columnList = "host_id"),
        @Index(name = "idx_contests_invite_code", columnList = "invite_code")
})
@Getter
@Setter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class Contest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time", nullable = false)
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private ContestStatus status = ContestStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Visibility visibility;

    @Enumerated(EnumType.STRING)
    @Column(name = "reg_type", nullable = false, length = 15)
    private RegType regType;

    @Enumerated(EnumType.STRING)
    @Column(name = "scoring_mode", nullable = false, length = 15)
    private ScoringMode scoringMode;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "invite_code", unique = true, length = 8)
    private String inviteCode;

    @Column(name = "invite_link", length = 500)
    private String inviteLink;

    @Column(name = "host_id", nullable = false)
    private UUID hostId;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
