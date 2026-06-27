package com.codeforge.contest.contest.repository;

import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.entity.ContestStatus;
import com.codeforge.contest.contest.entity.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContestRepository extends JpaRepository<Contest, UUID> {

    Optional<Contest> findByInviteCode(String inviteCode);

    Page<Contest> findByStatusAndVisibilityAndDeletedAtIsNull(
            ContestStatus status, Visibility visibility, Pageable pageable);

    List<Contest> findByHostIdAndDeletedAtIsNull(UUID hostId);

    Optional<Contest> findByIdAndDeletedAtIsNull(UUID id);

    List<Contest> findByStatusAndStartTimeBefore(ContestStatus status, Instant time);

    List<Contest> findByStatusAndEndTimeBefore(ContestStatus status, Instant time);
}
