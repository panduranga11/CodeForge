package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class AccountSuspendedException extends AppException {
    public AccountSuspendedException() {
        super("Account is suspended", HttpStatus.FORBIDDEN, "ACCOUNT_SUSPENDED");
    }
}
