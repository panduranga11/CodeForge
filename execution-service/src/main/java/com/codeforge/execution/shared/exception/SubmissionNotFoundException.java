package com.codeforge.execution.shared.exception;

import org.springframework.http.HttpStatus;

public class SubmissionNotFoundException extends AppException {

    public SubmissionNotFoundException() {
        super("Submission not found", HttpStatus.NOT_FOUND, "SUBMISSION_NOT_FOUND");
    }
}
