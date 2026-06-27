package com.codeforge.execution.shared.exception;

import org.springframework.http.HttpStatus;

public class NotAParticipantException extends AppException {

    public NotAParticipantException() {
        super("User is not a registered participant of this contest",
                HttpStatus.FORBIDDEN, "NOT_A_PARTICIPANT");
    }
}
