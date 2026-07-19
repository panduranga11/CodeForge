package com.codeforge.auth.oauth2.repository;

import com.codeforge.auth.oauth2.entity.OAuthProvider;
import com.codeforge.auth.oauth2.entity.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OAuthProviderRepository extends JpaRepository<OAuthProvider, UUID> {

    Optional<OAuthProvider> findByProviderAndProviderId(Provider provider, String providerId);
}
