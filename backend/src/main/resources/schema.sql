-- =====================================================================
-- StepFlow Auth — MySQL schema (pre-made)
-- Run this ONCE before starting the app:
--     mysql -u root -p < schema.sql
-- (or paste it into MySQL Workbench and execute)
-- Column names use snake_case to match the JPA entities' default mapping.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS stepflow_auth
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE stepflow_auth;

-- ---------------------------------------------------------------------
-- users  (maps to com.stepflow.auth.model.User)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(190) NOT NULL,
    password    VARCHAR(255) NOT NULL,                  -- BCrypt hash (never plaintext)
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER',   -- USER | ADMIN
    created_at  DATETIME(6)  NOT NULL,
    verified    BIT(1)       NOT NULL DEFAULT b'0',      -- email verified via link?
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- refresh_tokens  (maps to com.stepflow.auth.model.RefreshToken)
-- One row per issued refresh token; revoked = 1 means "logged out".
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    token       VARCHAR(100) NOT NULL,
    user_id     BIGINT       NOT NULL,
    expiry_date DATETIME(6)  NOT NULL,
    revoked     BIT(1)       NOT NULL DEFAULT b'0',
    PRIMARY KEY (id),
    CONSTRAINT uk_refresh_token UNIQUE (token),
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- verification_tokens  (maps to com.stepflow.auth.model.VerificationToken)
-- One-time email-verification links; consumed when the user clicks them.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verification_tokens (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    token       VARCHAR(100) NOT NULL,
    user_id     BIGINT       NOT NULL,
    expiry_date DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_verification_token UNIQUE (token),
    CONSTRAINT fk_verification_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
