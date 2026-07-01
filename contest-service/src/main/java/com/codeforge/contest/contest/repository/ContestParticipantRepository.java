package com.codeforge.contest.contest.repository;

import com.codeforge.contest.contest.entity.Contest;
import com.codeforge.contest.contest.entity.ContestParticipant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface ContestParticipantRepository extends JpaRepository<ContestParticipant, UUID> {

    boolean existsByContestIdAndUserId(UUID contestId, UUID userId);

    long countByContestId(UUID contestId);

    long countByUserId(UUID userId);

    Optional<ContestParticipant> findByContestIdAndUserId(UUID contestId, UUID userId);

    @Query("SELECT cp.contest FROM ContestParticipant cp WHERE cp.userId = :userId AND cp.contest.deletedAt IS NULL ORDER BY cp.registeredAt DESC")
    Page<Contest> findContestsByUserId(@Param("userId") UUID userId, Pageable pageable);
}
