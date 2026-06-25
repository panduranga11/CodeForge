package com.codeforge.contest.contest.repository;

import com.codeforge.contest.contest.entity.ContestParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ContestParticipantRepository extends JpaRepository<ContestParticipant, UUID> {

    boolean existsByContestIdAndUserId(UUID contestId, UUID userId);

    long countByContestId(UUID contestId);

    Optional<ContestParticipant> findByContestIdAndUserId(UUID contestId, UUID userId);
}
