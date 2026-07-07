package com.codeforge.contest.contest.repository;

import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.entity.ContestStatus;
import com.codeforge.contest.contest.entity.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContestRepository extends JpaRepository<Contest, UUID> {

    Optional<Contest> findByInviteCode(String inviteCode);

    Page<Contest> findByStatusAndVisibilityAndDeletedAtIsNull(
            ContestStatus status, Visibility visibility, Pageable pageable);

    Page<Contest> findByStatusInAndVisibilityAndDeletedAtIsNull(
            List<ContestStatus> statuses, Visibility visibility, Pageable pageable);

    List<Contest> findByHostIdAndDeletedAtIsNull(UUID hostId);

    Optional<Contest> findByIdAndDeletedAtIsNull(UUID id);

    Page<Contest> findByDeletedAtIsNull(Pageable pageable);

    Page<Contest> findByVisibilityAndDeletedAtIsNull(Visibility visibility, Pageable pageable);

    Page<Contest> findByStatusAndDeletedAtIsNull(ContestStatus status, Pageable pageable);

    Page<Contest> findByHostIdAndDeletedAtIsNull(UUID hostId, Pageable pageable);

    List<Contest> findByStatusAndStartTimeBefore(ContestStatus status, Instant time);

    List<Contest> findByStatusAndEndTimeBefore(ContestStatus status, Instant time);

    @Modifying
    @Query("UPDATE Contest c SET c.currentParticipants = c.currentParticipants + 1 " +
           "WHERE c.id = :contestId " +
           "AND (c.maxParticipants IS NULL OR c.currentParticipants < c.maxParticipants)")
    int tryReserveSlot(@Param("contestId") UUID contestId);
}
