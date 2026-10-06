-- =====================================================================
-- Migration: add email verification (run ONCE on an existing database)
--     mysql -u root -p stepflow_auth < migration-email-verification.sql
-- Safe to re-run: guards against re-adding.
-- =====================================================================
USE stepflow_auth;

-- 1. Add the "verified" flag to users (if it isn't already there)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = 'stepflow_auth'
               AND TABLE_NAME = 'users'
               AND COLUMN_NAME = 'verified');
SET @sql := IF(@col = 0,
    'ALTER TABLE users ADD COLUMN verified BIT(1) NOT NULL DEFAULT b''0''',
    'SELECT "column verified already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Create the verification_tokens table
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
