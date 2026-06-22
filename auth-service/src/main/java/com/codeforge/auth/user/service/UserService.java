package com.codeforge.auth.user.service;

import com.codeforge.auth.user.dto.*;

import java.util.UUID;

public interface UserService {

    TokenResponse register(RegisterRequest request);

    TokenResponse login(LoginRequest request);

    TokenResponse refreshToken(String refreshToken);

    void logout(String accessToken, String refreshToken);

    UserResponse getProfile(UUID userId);

    UserResponse updateProfile(UUID userId, UpdateProfileRequest request);

    TokenResponse upgradeToOrganizer(UUID userId);
}
