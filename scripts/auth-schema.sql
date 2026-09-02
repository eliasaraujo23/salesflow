-- Schema do banco dedicado à autenticação (Neon Postgres, isolado dos demais bancos).
-- Rodar uma única vez no banco novo (AUTH_DATABASE_URL).
-- Não roda automaticamente — sem migrations geridas por ferramenta neste projeto.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT NOT NULL UNIQUE,
  firebase_uid         TEXT UNIQUE,
  password_hash        TEXT,
  name                 TEXT NOT NULL DEFAULT '',
  person_key           TEXT,
  cargo                TEXT,
  role                 TEXT NOT NULL DEFAULT 'user',
  permissions          TEXT[] NOT NULL DEFAULT '{}',
  token_version        INTEGER NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  must_reset_password  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (lower(email));

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent   TEXT,
  ip_address   TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);
