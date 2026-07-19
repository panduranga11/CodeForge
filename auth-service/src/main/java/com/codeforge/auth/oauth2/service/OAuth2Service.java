package com.codeforge.auth.oauth2.service;

import com.codeforge.auth.oauth2.dto.OAuth2UserInfo;
import com.codeforge.auth.oauth2.entity.Provider;
import com.codeforge.auth.user.dto.TokenResponse;

public interface OAuth2Service {

    TokenResponse handleOAuthCallback(Provider provider, OAuth2UserInfo userInfo);
}
