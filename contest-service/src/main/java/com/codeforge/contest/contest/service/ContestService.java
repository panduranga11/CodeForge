package com.codeforge.contest.contest.service;

import com.codeforge.contest.contest.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ContestService {

    ContestResponse create(CreateContestRequest request, UUID hostId);

    ContestResponse getById(UUID id);

    ContestResponse getByInviteCode(String inviteCode);

    Page<ContestResponse> list(Pageable pageable);

    Page<ContestResponse> explore(Pageable pageable);

    ContestResponse schedule(UUID contestId, UUID userId);

    ContestResponse cancel(UUID contestId, UUID userId);

    void register(UUID contestId, UUID userId);

    JoinContestResponse join(JoinContestRequest request, UUID userId);

    boolean isParticipant(UUID contestId, UUID userId);

    void activate(UUID contestId);

    void complete(UUID contestId);
}
