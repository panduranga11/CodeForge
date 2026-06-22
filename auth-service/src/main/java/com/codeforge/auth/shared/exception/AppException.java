package com.codeforge.auth.shared.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base exception for all application-specific exceptions.
 * All custom exceptions extend this to provide consistent error handling.
 */
@Getter
public class AppException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public AppException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }
}
