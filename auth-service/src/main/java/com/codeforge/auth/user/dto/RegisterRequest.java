package com.codeforge.auth.user.dto;

import jakarta.validation.constraints.*;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 100)
        String fullName,

        @NotBlank @Email
        String email,

        @NotBlank @Size(min = 8)
        @Pattern(regexp = ".*[A-Z].*", message = "must contain at least one uppercase letter")
        @Pattern(regexp = ".*[0-9].*", message = "must contain at least one digit")
        @Pattern(regexp = ".*[!@#$%^&*].*", message = "must contain at least one special character")
        String password
) {}
