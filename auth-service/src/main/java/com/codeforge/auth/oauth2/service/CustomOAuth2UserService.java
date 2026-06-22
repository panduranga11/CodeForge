package com.codeforge.auth.oauth2.service;

import com.codeforge.auth.oauth2.dto.OAuth2UserInfo;
import com.codeforge.auth.oauth2.entity.Provider;
import com.codeforge.auth.user.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Intercepts the OAuth2 login flow after the provider returns user data.
 * Extracts provider-specific user info, delegates account resolution
 * to OAuth2Service, and attaches the resulting TokenResponse to the
 * OAuth2User attributes so the SuccessHandler can read it.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private static final String TOKEN_RESPONSE_ATTR = "tokenResponse";

    private final DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
    private final OAuth2Service oAuth2Service;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = delegate.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Provider provider = resolveProvider(registrationId);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        OAuth2UserInfo userInfo = extractUserInfo(provider, attributes);
        if (userInfo.getEmail() == null || userInfo.getEmail().isBlank()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("email_not_found"),
                    "Email not available from " + provider);
        }

        TokenResponse tokenResponse = oAuth2Service.handleOAuthCallback(provider, userInfo);

        // Attach the tokenResponse into attributes so the SuccessHandler can retrieve it
        Map<String, Object> enrichedAttributes = new java.util.HashMap<>(attributes);
        enrichedAttributes.put(TOKEN_RESPONSE_ATTR, tokenResponse);

        String nameAttribute = userRequest.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                enrichedAttributes,
                nameAttribute
        );
    }

    private OAuth2UserInfo extractUserInfo(Provider provider, Map<String, Object> attributes) {
        return switch (provider) {
            case GOOGLE -> extractGoogleUserInfo(attributes);
            case GITHUB -> extractGitHubUserInfo(attributes);
        };
    }

    private OAuth2UserInfo extractGoogleUserInfo(Map<String, Object> attributes) {
        return OAuth2UserInfo.builder()
                .providerId(getString(attributes, "sub"))
                .email(getString(attributes, "email"))
                .name(getString(attributes, "name"))
                .avatarUrl(getString(attributes, "picture"))
                .build();
    }

    private OAuth2UserInfo extractGitHubUserInfo(Map<String, Object> attributes) {
        Object idValue = attributes.get("id");
        String providerId = idValue != null ? idValue.toString() : null;

        return OAuth2UserInfo.builder()
                .providerId(providerId)
                .email(getString(attributes, "email"))
                .name(getString(attributes, "name"))
                .avatarUrl(getString(attributes, "avatar_url"))
                .build();
    }

    private Provider resolveProvider(String registrationId) {
        return switch (registrationId.toLowerCase()) {
            case "google" -> Provider.GOOGLE;
            case "github" -> Provider.GITHUB;
            default -> throw new OAuth2AuthenticationException(
                    new OAuth2Error("unsupported_provider"),
                    "Unsupported OAuth2 provider: " + registrationId);
        };
    }

    private String getString(Map<String, Object> attributes, String key) {
        Object value = attributes.get(key);
        return value != null ? value.toString() : null;
    }
}
