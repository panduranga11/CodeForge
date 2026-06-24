package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ProblemNotFoundException extends AppException {
    public ProblemNotFoundException(UUID id) {
        super("Problem not found: " + id, HttpStatus.NOT_FOUND, "PROBLEM_NOT_FOUND");
    }
}
