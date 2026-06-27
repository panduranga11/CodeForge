package com.codeforge.contest.shared.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Service
@Slf4j
public class CacheService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public CacheService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    public <T> void put(String key, T value, Duration ttl) {
        try {
            String json = objectMapper.writeValueAsString(value);
            redisTemplate.opsForValue().set(key, json, ttl);
        } catch (JsonProcessingException e) {
            log.warn("Failed to cache key {}: {}", key, e.getMessage());
        }
    }

    public <T> Optional<T> get(String key, Class<T> type) {
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) return Optional.empty();
        try {
            return Optional.of(objectMapper.readValue(json, type));
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize cache key {}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public <T> Optional<T> get(String key, TypeReference<T> typeRef) {
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) return Optional.empty();
        try {
            return Optional.of(objectMapper.readValue(json, typeRef));
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize cache key {}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public void evict(String key) {
        redisTemplate.delete(key);
    }

    public void evictPattern(String pattern) {
        Set<String> keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
