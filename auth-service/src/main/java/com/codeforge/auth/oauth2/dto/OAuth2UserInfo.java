package com.codeforge.auth.oauth2.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OAuth2UserInfo {

    private final String providerId;
    private final String email;
    private final String name;
    private final String avatarUrl;
}
