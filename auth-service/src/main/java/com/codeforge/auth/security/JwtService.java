package com.codeforge.auth.security;

import com.codeforge.auth.shared.config.JwtProperties;
import com.codeforge.auth.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.UUID;

@Service
@Slf4j
public class JwtService {

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";

    private final JwtProperties jwtProperties;
    private final StringRedisTemplate redisTemplate;

    public JwtService(JwtProperties jwtProperties,
                      @Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.jwtProperties = jwtProperties;
        this.redisTemplate = redisTemplate;
        if (redisTemplate == null) {
            log.warn("Redis is not available — JWT blacklisting is disabled");
        }
    }

    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getAccessTokenExpiryMs());

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", "ROLE_" + user.getRole().name())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
    }

    public String generateRefreshToken() {
        return UUID.randomUUID().toString();
    }

    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(String token) {
        Claims claims = validateToken(token);
        return UUID.fromString(claims.getSubject());
    }

    public String extractRole(String token) {
        Claims claims = validateToken(token);
        return claims.get("role", String.class);
    }

    public boolean isTokenBlacklisted(String token) {
        if (redisTemplate == null) return false;
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));
    }

    public void blacklistToken(String token) {
        if (redisTemplate == null) {
            log.debug("Redis unavailable — skipping token blacklist");
            return;
        }
        try {
            Claims claims = validateToken(token);
            long ttlMs = claims.getExpiration().getTime() - System.currentTimeMillis();
            if (ttlMs > 0) {
                redisTemplate.opsForValue().set(
                        BLACKLIST_PREFIX + token,
                        "blacklisted",
                        Duration.ofMillis(ttlMs)
                );
            }
        } catch (Exception ex) {
            log.warn("Could not blacklist token: {}", ex.getMessage());
        }
    }

    public long getRefreshTokenExpiryMs() {
        return jwtProperties.getRefreshTokenExpiryMs();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }
}
