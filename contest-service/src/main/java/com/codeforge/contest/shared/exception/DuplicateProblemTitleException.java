package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

public class DuplicateProblemTitleException extends AppException {
    public DuplicateProblemTitleException(String title) {
        super("Problem with this title already exists: " + title, HttpStatus.CONFLICT, "DUPLICATE_PROBLEM_TITLE");
    }
}
