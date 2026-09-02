-- Schema do banco dedicado ao módulo Controle de Lojas (Neon Postgres).
-- Rodar uma única vez no banco novo (CONTROLE_LOJAS_DATABASE_URL).
-- Não roda automaticamente — sem migrations geridas por ferramenta neste projeto.

CREATE TABLE IF NOT EXISTS avaliadores (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bancos_caixa (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS motivos_nc (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modalidades (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresas (
  id           TEXT PRIMARY KEY,
  nome         TEXT NOT NULL UNIQUE,
  modalidade_id TEXT REFERENCES modalidades(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_despesa (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formas_pagamento (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_lancamento (
  id         TEXT PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feedbacks de compra: lista própria por loja (gtt, gti, 24k, ci, ptq, pgt).
CREATE TABLE IF NOT EXISTS feedbacks_compra (
  id         TEXT NOT NULL,
  loja       TEXT NOT NULL,
  nome       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (loja, id),
  UNIQUE (loja, nome)
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_compra_loja ON feedbacks_compra(loja);
