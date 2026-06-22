-- ===================================================================
-- V3: Create refresh_tokens table
-- Auth Database (auth_db)
-- ===================================================================

CREATE TABLE refresh_tokens (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    token           TEXT            NOT NULL,
    expires_at      TIMESTAMP       NOT NULL,
    revoked         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Index for token lookups (refresh flow)
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token);

-- Index for user_id lookups (revoke all tokens for user)
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
