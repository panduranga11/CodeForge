package com.codeforge.auth.oauth2.dto;

import java.time.LocalDateTime;

public record OAuthProviderResponse(
        String provider,
        String providerEmail,
        LocalDateTime linkedAt
) {}
