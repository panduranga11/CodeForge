package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class UserNotFoundException extends AppException {
    public UserNotFoundException(UUID userId) {
        super("User not found: " + userId, HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
    }
}
