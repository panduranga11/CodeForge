package com.codeforge.auth.user.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String fullName,
        String email,
        String role,
        String status,
        String avatarUrl,
        String authType,
        LocalDateTime createdAt
) {}
