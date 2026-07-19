package com.codeforge.auth.oauth2.service;

import com.codeforge.auth.oauth2.dto.OAuth2UserInfo;
import com.codeforge.auth.oauth2.entity.OAuthProvider;
import com.codeforge.auth.oauth2.entity.Provider;
import com.codeforge.auth.oauth2.repository.OAuthProviderRepository;
import com.codeforge.auth.security.JwtService;
import com.codeforge.auth.user.dto.TokenResponse;
import com.codeforge.auth.user.entity.AuthType;
import com.codeforge.auth.user.entity.RefreshToken;
import com.codeforge.auth.user.entity.Role;
import com.codeforge.auth.user.entity.User;
import com.codeforge.auth.user.entity.UserStatus;
import com.codeforge.auth.user.mapper.UserMapper;
import com.codeforge.auth.user.repository.RefreshTokenRepository;
import com.codeforge.auth.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class OAuth2ServiceImpl implements OAuth2Service {

    private final UserRepository userRepository;
    private final OAuthProviderRepository oauthProviderRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final UserMapper userMapper;

    @Override
    public TokenResponse handleOAuthCallback(Provider provider, OAuth2UserInfo userInfo) {
        // Check if this OAuth account is already linked to a user
        Optional<OAuthProvider> existingOAuth = oauthProviderRepository
                .findByProviderAndProviderId(provider, userInfo.getProviderId());

        User user;
        if (existingOAuth.isPresent()) {
            user = existingOAuth.get().getUser();
        } else {
            // Case A: User with this email already exists → link provider
            // Case B: New user → create account
            user = userRepository.findByEmail(userInfo.getEmail())
                    .map(existingUser -> linkOAuthToExistingUser(existingUser, provider, userInfo))
                    .orElseGet(() -> createOAuthUser(provider, userInfo));
        }

        log.info("OAuth login provider={} userId={}", provider, user.getId());
        return buildTokenResponse(user);
    }

    private User linkOAuthToExistingUser(User user, Provider provider, OAuth2UserInfo userInfo) {
        createOAuthProviderRecord(user, provider, userInfo);
        user.setAuthType(AuthType.BOTH);
        if (user.getAvatarUrl() == null && userInfo.getAvatarUrl() != null) {
            user.setAvatarUrl(userInfo.getAvatarUrl());
        }
        return userRepository.save(user);
    }

    private User createOAuthUser(Provider provider, OAuth2UserInfo userInfo) {
        User user = new User();
        user.setFullName(userInfo.getName() != null ? userInfo.getName() : userInfo.getEmail());
        user.setEmail(userInfo.getEmail());
        user.setRole(Role.STUDENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setAvatarUrl(userInfo.getAvatarUrl());
        user.setAuthType(AuthType.OAUTH);
        user.setCreatedBy(userInfo.getEmail());
        user = userRepository.save(user);

        createOAuthProviderRecord(user, provider, userInfo);
        log.info("OAuth user created id={} provider={}", user.getId(), provider);
        return user;
    }

    private void createOAuthProviderRecord(User user, Provider provider, OAuth2UserInfo userInfo) {
        OAuthProvider oauthProvider = new OAuthProvider();
        oauthProvider.setUser(user);
        oauthProvider.setProvider(provider);
        oauthProvider.setProviderId(userInfo.getProviderId());
        oauthProvider.setProviderEmail(userInfo.getEmail());
        oauthProvider.setAvatarUrl(userInfo.getAvatarUrl());
        oauthProviderRepository.save(oauthProvider);
    }

    private TokenResponse buildTokenResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken();

        RefreshToken tokenEntity = new RefreshToken();
        tokenEntity.setUser(user);
        tokenEntity.setToken(refreshToken);
        tokenEntity.setExpiresAt(LocalDateTime.now().plusSeconds(
                jwtService.getRefreshTokenExpiryMs() / 1000));
        refreshTokenRepository.save(tokenEntity);

        return new TokenResponse(accessToken, refreshToken, userMapper.toResponse(user));
    }
}
