package com.codeforge.auth.oauth2.service;

import com.codeforge.auth.oauth2.dto.OAuthProviderResponse;
import com.codeforge.auth.oauth2.dto.OAuth2UserInfo;
import com.codeforge.auth.oauth2.entity.Provider;
import com.codeforge.auth.user.dto.TokenResponse;

import java.util.List;
import java.util.UUID;

public interface OAuth2Service {

    TokenResponse handleOAuthCallback(Provider provider, OAuth2UserInfo userInfo);

    void linkProvider(UUID userId, Provider provider, OAuth2UserInfo userInfo);

    void unlinkProvider(UUID userId, Provider provider);

    List<OAuthProviderResponse> getLinkedProviders(UUID userId);
}
