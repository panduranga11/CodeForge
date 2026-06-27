package com.codeforge.execution.shared.exception;

import org.springframework.http.HttpStatus;

public class RateLimitExceededException extends AppException {

    public RateLimitExceededException() {
        super("Rate limit exceeded. Please wait before submitting again.",
                HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED");
    }
}
