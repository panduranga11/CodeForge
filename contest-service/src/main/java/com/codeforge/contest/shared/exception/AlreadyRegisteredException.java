package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

public class AlreadyRegisteredException extends AppException {
    public AlreadyRegisteredException() {
        super("Already registered for this contest", HttpStatus.CONFLICT, "ALREADY_REGISTERED");
    }
}
