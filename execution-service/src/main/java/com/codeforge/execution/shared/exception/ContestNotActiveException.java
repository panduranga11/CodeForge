package com.codeforge.execution.shared.exception;

import org.springframework.http.HttpStatus;

public class ContestNotActiveException extends AppException {

    public ContestNotActiveException() {
        super("Contest is not active", HttpStatus.BAD_REQUEST, "CONTEST_NOT_ACTIVE");
    }
}
