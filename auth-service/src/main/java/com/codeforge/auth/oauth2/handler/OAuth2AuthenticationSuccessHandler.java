package com.codeforge.auth.oauth2.handler;

import com.codeforge.auth.user.dto.TokenResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * Invoked after Spring Security completes OAuth2 authentication.
 * Reads the TokenResponse attached by CustomOAuth2UserService,
 * then redirects to the frontend callback URL with tokens in the URL fragment.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final String TOKEN_RESPONSE_ATTR = "tokenResponse";

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        TokenResponse tokenResponse = (TokenResponse) oAuth2User.getAttributes().get(TOKEN_RESPONSE_ATTR);

        if (tokenResponse == null) {
            log.error("TokenResponse not found in OAuth2User attributes");
            response.sendRedirect(frontendUrl + "/auth/callback?error=internal_error");
            return;
        }

        // Build redirect URL with tokens in fragment (#) per HLD security note
        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/auth/callback")
                .fragment("accessToken=" + tokenResponse.accessToken()
                        + "&refreshToken=" + tokenResponse.refreshToken())
                .build()
                .toUriString();

        log.info("OAuth2 login successful, redirecting to frontend");
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }
}
