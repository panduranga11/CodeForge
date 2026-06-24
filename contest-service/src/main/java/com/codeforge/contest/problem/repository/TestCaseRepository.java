package com.codeforge.contest.problem.repository;

import com.codeforge.contest.problem.entity.TestCase;
import com.codeforge.contest.problem.entity.TestCaseType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TestCaseRepository extends JpaRepository<TestCase, UUID> {

    List<TestCase> findByProblemId(UUID problemId);

    List<TestCase> findByProblemIdAndType(UUID problemId, TestCaseType type);

    long countByProblemIdAndType(UUID problemId, TestCaseType type);
}
