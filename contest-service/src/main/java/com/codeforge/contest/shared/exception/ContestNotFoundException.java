package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ContestNotFoundException extends AppException {
    public ContestNotFoundException(UUID id) {
        super("Contest not found: " + id, HttpStatus.NOT_FOUND, "CONTEST_NOT_FOUND");
    }
}
