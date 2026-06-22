-- ===================================================================
-- V1: Create users table
-- Auth Database (auth_db)
-- ===================================================================

CREATE TABLE users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(100)    NOT NULL,
    email           VARCHAR(255)    NOT NULL,
    password        VARCHAR(255)    NULL,
    role            VARCHAR(20)     NOT NULL DEFAULT 'STUDENT',
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    avatar_url      VARCHAR(500)    NULL,
    auth_type       VARCHAR(10)     NOT NULL DEFAULT 'LOCAL',
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(255)    NOT NULL DEFAULT 'system',

    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('STUDENT', 'ORGANIZER', 'ADMIN')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INACTIVE')),
    CONSTRAINT chk_users_auth_type CHECK (auth_type IN ('LOCAL', 'OAUTH', 'BOTH'))
);

-- Index for email lookups (login, registration checks)
CREATE INDEX idx_users_email ON users (email);
