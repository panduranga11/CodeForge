package com.codeforge.auth.user.service;

import com.codeforge.auth.security.JwtService;
import com.codeforge.auth.shared.exception.*;
import com.codeforge.auth.user.dto.*;
import com.codeforge.auth.user.entity.*;
import com.codeforge.auth.user.mapper.UserMapper;
import com.codeforge.auth.user.repository.RefreshTokenRepository;
import com.codeforge.auth.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    public TokenResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new EmailAlreadyExistsException(request.email());
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.STUDENT);
        user.setStatus(UserStatus.ACTIVE);
        user.setAuthType(AuthType.LOCAL);
        user.setCreatedBy(request.email());

        user = userRepository.save(user);
        log.info("User registered id={} email={}", user.getId(), user.getEmail());

        return buildTokenResponse(user);
    }

    @Override
    public TokenResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (user.getPassword() == null) {
            throw new PasswordNotSetException();
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new AccountSuspendedException();
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AccountNotActiveException();
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        log.info("User logged in id={}", user.getId());
        return buildTokenResponse(user);
    }

    @Override
    public TokenResponse refreshToken(String refreshToken) {
        RefreshToken storedToken = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(InvalidRefreshTokenException::new);

        if (storedToken.isRevoked() || storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidRefreshTokenException();
        }

        storedToken.setRevoked(true);
        refreshTokenRepository.save(storedToken);

        User user = storedToken.getUser();
        log.info("Token refreshed for user id={}", user.getId());
        return buildTokenResponse(user);
    }

    @Override
    public void logout(String accessToken, String refreshToken) {
        if (accessToken != null) {
            jwtService.blacklistToken(accessToken);
        }

        refreshTokenRepository.findByToken(refreshToken).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
        });

        log.info("User logged out");
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getProfile(UUID userId) {
        User user = findUserById(userId);
        return userMapper.toResponse(user);
    }

    @Override
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = findUserById(userId);

        if (request.fullName() != null) {
            user.setFullName(request.fullName());
        }

        if (request.newPassword() != null) {
            if (user.getPassword() == null) {
                throw new PasswordNotSetException();
            }
            if (request.currentPassword() == null ||
                    !passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
                throw new InvalidCredentialsException();
            }
            user.setPassword(passwordEncoder.encode(request.newPassword()));
        }

        user = userRepository.save(user);
        log.info("Profile updated for user id={}", userId);
        return userMapper.toResponse(user);
    }

    @Override
    public TokenResponse upgradeToOrganizer(UUID userId) {
        User user = findUserById(userId);

        if (user.getRole() != Role.STUDENT) {
            throw new AlreadyOrganizerException();
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AccountNotActiveException();
        }

        user.setRole(Role.ORGANIZER);
        user = userRepository.save(user);

        refreshTokenRepository.revokeAllByUserId(userId);

        log.info("User upgraded to ORGANIZER id={}", userId);
        return buildTokenResponse(user);
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

    private User findUserById(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }
}
