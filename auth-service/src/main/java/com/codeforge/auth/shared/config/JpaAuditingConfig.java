package com.codeforge.auth.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.util.Optional;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            // In this architecture, the Gateway forwards X-User-Email header.
            // For audit purposes, default to "system" — service-level auditing
            // is supplemented by explicit createdBy in service methods.
            return Optional.of("system");
        };
    }
}
