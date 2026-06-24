package com.codeforge.contest.problem.repository;

import com.codeforge.contest.problem.entity.Problem;
import com.codeforge.contest.problem.entity.ProblemStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProblemRepository extends JpaRepository<Problem, UUID> {

    List<Problem> findByContestIdAndDeletedAtIsNullOrderBySequenceNo(UUID contestId);

    List<Problem> findByContestIdAndStatusAndDeletedAtIsNullOrderBySequenceNo(
            UUID contestId, ProblemStatus status);

    Optional<Problem> findByIdAndContestIdAndDeletedAtIsNull(UUID id, UUID contestId);

    Optional<Problem> findByIdAndDeletedAtIsNull(UUID id);

    boolean existsByTitleAndContestId(String title, UUID contestId);

    long countByContestIdAndDeletedAtIsNull(UUID contestId);

    long countByContestIdAndStatusAndDeletedAtIsNull(UUID contestId, ProblemStatus status);
}
