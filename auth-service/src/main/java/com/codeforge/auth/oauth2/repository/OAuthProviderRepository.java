package com.codeforge.auth.oauth2.repository;

import com.codeforge.auth.oauth2.entity.OAuthProvider;
import com.codeforge.auth.oauth2.entity.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OAuthProviderRepository extends JpaRepository<OAuthProvider, UUID> {

    Optional<OAuthProvider> findByProviderAndProviderId(Provider provider, String providerId);

    List<OAuthProvider> findByUserId(UUID userId);

    Optional<OAuthProvider> findByUserIdAndProvider(UUID userId, Provider provider);

    boolean existsByUserIdAndProvider(UUID userId, Provider provider);

    long countByUserId(UUID userId);
}
