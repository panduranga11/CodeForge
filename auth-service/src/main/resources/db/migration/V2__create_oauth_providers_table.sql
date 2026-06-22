-- ===================================================================
-- V2: Create oauth_providers table
-- Auth Database (auth_db)
-- ===================================================================

CREATE TABLE oauth_providers (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL,
    provider        VARCHAR(10)     NOT NULL,
    provider_id     VARCHAR(255)    NOT NULL,
    provider_email  VARCHAR(255)    NULL,
    avatar_url      VARCHAR(500)    NULL,
    linked_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_oauth_providers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_oauth_user_provider UNIQUE (user_id, provider),
    CONSTRAINT uk_oauth_provider_id UNIQUE (provider, provider_id),
    CONSTRAINT chk_oauth_provider CHECK (provider IN ('GOOGLE', 'GITHUB'))
);

-- Index for user_id lookups (list linked providers)
CREATE INDEX idx_oauth_providers_user_id ON oauth_providers (user_id);

-- Index for provider + provider_id lookups (OAuth callback resolution)
CREATE INDEX idx_oauth_provider_provider_id ON oauth_providers (provider, provider_id);
