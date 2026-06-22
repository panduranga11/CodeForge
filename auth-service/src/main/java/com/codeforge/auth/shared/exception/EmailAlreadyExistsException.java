package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class EmailAlreadyExistsException extends AppException {
    public EmailAlreadyExistsException(String email) {
        super("Email already registered: " + email, HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS");
    }
}
