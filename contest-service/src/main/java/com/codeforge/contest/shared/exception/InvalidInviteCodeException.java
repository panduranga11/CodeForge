package com.codeforge.contest.shared.exception;

import org.springframework.http.HttpStatus;

public class InvalidInviteCodeException extends AppException {
    public InvalidInviteCodeException(String code) {
        super("Invalid invite code: " + code, HttpStatus.NOT_FOUND, "INVALID_INVITE_CODE");
    }
}
