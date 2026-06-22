package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class PasswordNotSetException extends AppException {
    public PasswordNotSetException() {
        super("Password not set. Please use OAuth login.", HttpStatus.BAD_REQUEST, "PASSWORD_NOT_SET");
    }
}
