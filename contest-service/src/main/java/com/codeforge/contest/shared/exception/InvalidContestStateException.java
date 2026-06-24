package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

public class InvalidContestStateException extends AppException {
    public InvalidContestStateException(String message) {
        super(message, HttpStatus.CONFLICT, "INVALID_CONTEST_STATE");
    }
}
