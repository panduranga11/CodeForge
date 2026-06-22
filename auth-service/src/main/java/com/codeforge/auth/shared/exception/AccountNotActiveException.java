package com.codeforge.auth.shared.exception;

import org.springframework.http.HttpStatus;

public class AccountNotActiveException extends AppException {
    public AccountNotActiveException() {
        super("Account is not active", HttpStatus.FORBIDDEN, "ACCOUNT_NOT_ACTIVE");
    }
}
