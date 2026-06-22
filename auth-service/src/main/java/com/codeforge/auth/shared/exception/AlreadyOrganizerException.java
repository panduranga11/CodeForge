package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class AlreadyOrganizerException extends AppException {
    public AlreadyOrganizerException() {
        super("User is already an ORGANIZER or ADMIN", HttpStatus.BAD_REQUEST, "ALREADY_ORGANIZER");
    }
}
