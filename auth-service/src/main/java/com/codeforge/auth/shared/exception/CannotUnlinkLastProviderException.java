package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class CannotUnlinkLastProviderException extends AppException {
    public CannotUnlinkLastProviderException() {
        super("Cannot unlink provider — no remaining login method",
                HttpStatus.BAD_REQUEST, "CANNOT_UNLINK_LAST_PROVIDER");
    }
}
