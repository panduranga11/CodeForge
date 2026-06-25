package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

public class UnauthorizedAccessException extends AppException {
    public UnauthorizedAccessException(String message) {
        super(message, HttpStatus.FORBIDDEN, "UNAUTHORIZED_ACCESS");
    }
}
