package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class ProviderAlreadyLinkedException extends AppException {
    public ProviderAlreadyLinkedException(String provider) {
        super("OAuth provider already linked to another account: " + provider,
                HttpStatus.CONFLICT, "PROVIDER_ALREADY_LINKED");
    }
}
