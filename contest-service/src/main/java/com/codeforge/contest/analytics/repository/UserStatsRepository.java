package com.codeforge.contest.analytics.repository;

import com.codeforge.contest.analytics.entity.UserStats;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserStatsRepository extends JpaRepository<UserStats, UUID> {
}
