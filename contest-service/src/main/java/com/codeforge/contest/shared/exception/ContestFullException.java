package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

public class ContestFullException extends AppException {
    public ContestFullException() {
        super("Contest has reached maximum participants", HttpStatus.CONFLICT, "CONTEST_FULL");
    }
}
