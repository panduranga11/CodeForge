package com.codeforge.auth.user.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        UserResponse user
) {}
