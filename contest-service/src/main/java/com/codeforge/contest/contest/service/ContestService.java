package com.codeforge.contest.contest.service;

import com.codeforge.contest.contest.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.UUID;

public interface ContestService {

    ContestResponse create(CreateContestRequest request, UUID hostId);

    ContestResponse getById(UUID id);

    ContestResponse getByInviteCode(String inviteCode);

    Page<ContestResponse> list(Pageable pageable);

    Page<ContestResponse> explore(Pageable pageable);

    Page<ContestResponse> myContests(UUID hostId, Pageable pageable);

    ContestResponse updateTimes(UUID contestId, UUID userId, Instant startTime, Instant endTime);

    ContestResponse schedule(UUID contestId, UUID userId);

    ContestResponse cancel(UUID contestId, UUID userId);

    void register(UUID contestId, UUID userId, String userName);

    JoinContestResponse join(JoinContestRequest request, UUID userId, String userName);

    boolean isParticipant(UUID contestId, UUID userId);

    void activate(UUID contestId);

    void complete(UUID contestId);
}
