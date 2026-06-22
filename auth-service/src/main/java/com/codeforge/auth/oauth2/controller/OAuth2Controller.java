package com.codeforge.auth.oauth2.controller;

import com.codeforge.auth.oauth2.dto.OAuthProviderResponse;
import com.codeforge.auth.oauth2.dto.OAuth2UserInfo;
import com.codeforge.auth.oauth2.entity.Provider;
import com.codeforge.auth.oauth2.service.OAuth2Service;
import com.codeforge.auth.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Handles OAuth2 provider link/unlink operations.
 *
 * The authorize and callback endpoints are handled automatically by
 * Spring Security's OAuth2 Login flow configured in SecurityConfig:
 *   GET /auth/oauth2/authorize/{provider} → redirects to provider
 *   GET /auth/oauth2/callback/{provider}  → exchanges code, calls CustomOAuth2UserService,
 *                                            then OAuth2AuthenticationSuccessHandler redirects
 *                                            to frontend with JWT tokens
 */
@RestController
@RequestMapping("/auth/oauth2")
@RequiredArgsConstructor
public class OAuth2Controller {

    private final OAuth2Service oAuth2Service;

    @PostMapping("/link/{provider}")
    public ResponseEntity<ApiResponse<Void>> linkProvider(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable String provider,
            @RequestBody OAuth2UserInfo userInfo) {
        Provider providerEnum = Provider.valueOf(provider.toUpperCase());
        oAuth2Service.linkProvider(userId, providerEnum, userInfo);
        return ResponseEntity.ok(ApiResponse.success("Provider linked successfully", null));
    }

    @DeleteMapping("/unlink/{provider}")
    public ResponseEntity<ApiResponse<Void>> unlinkProvider(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable String provider) {
        Provider providerEnum = Provider.valueOf(provider.toUpperCase());
        oAuth2Service.unlinkProvider(userId, providerEnum);
        return ResponseEntity.ok(ApiResponse.success("Provider unlinked successfully", null));
    }

    @GetMapping("/providers")
    public ResponseEntity<ApiResponse<List<OAuthProviderResponse>>> getLinkedProviders(
            @RequestHeader("X-User-Id") UUID userId) {
        List<OAuthProviderResponse> providers = oAuth2Service.getLinkedProviders(userId);
        return ResponseEntity.ok(ApiResponse.success(providers));
    }
}
