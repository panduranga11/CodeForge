package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class InvalidRefreshTokenException extends AppException {
    public InvalidRefreshTokenException() {
        super("Invalid or expired refresh token", HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN");
    }
}
