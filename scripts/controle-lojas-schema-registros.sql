-- Schema de REGISTROS do módulo Controle de Lojas (Neon Postgres).
-- Complementa controle-lojas-schema.sql (listas de config).
-- Rodar uma única vez no banco CONTROLE_LOJAS_DATABASE_URL.

CREATE TABLE IF NOT EXISTS metal (
  id                TEXT PRIMARY KEY,
  loja              TEXT NOT NULL,
  cod_interno       TEXT NOT NULL,
  data              DATE NOT NULL,
  hora              TEXT NOT NULL,
  datetime          TIMESTAMPTZ NOT NULL,
  avaliadores       TEXT[] NOT NULL DEFAULT '{}',
  nome              TEXT NOT NULL DEFAULT '',
  cpf               TEXT NOT NULL DEFAULT '',
  transacao         TEXT NOT NULL CHECK (transacao IN ('COMPRA', 'NAO_COMPRA')),
  feedback_id       TEXT,
  feedback_nc_id    TEXT REFERENCES motivos_nc(id) ON DELETE SET NULL,
  motivo_nc         TEXT NOT NULL DEFAULT '',
  modalidade_id     TEXT REFERENCES modalidades(id) ON DELETE SET NULL,
  empresa_id        TEXT REFERENCES empresas(id) ON DELETE SET NULL,
  ouro_24k          NUMERIC NOT NULL DEFAULT 0,
  ouro_22k          NUMERIC NOT NULL DEFAULT 0,
  pt                NUMERIC NOT NULL DEFAULT 0,
  ouro_750          NUMERIC NOT NULL DEFAULT 0,
  ouro_720          NUMERIC NOT NULL DEFAULT 0,
  bx                NUMERIC NOT NULL DEFAULT 0,
  platina           NUMERIC NOT NULL DEFAULT 0,
  prata             NUMERIC NOT NULL DEFAULT 0,
  total_peso        NUMERIC NOT NULL DEFAULT 0,
  preco             NUMERIC NOT NULL DEFAULT 1 CHECK (preco IN (1,2,3,4,5)),
  valor             NUMERIC NOT NULL DEFAULT 0,
  pago_por_grama    NUMERIC NOT NULL DEFAULT 0,
  observacao        TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metal_loja ON metal(loja);
CREATE INDEX IF NOT EXISTS idx_metal_datetime ON metal(loja, datetime DESC);

CREATE TABLE IF NOT EXISTS despesa (
  id                 TEXT PRIMARY KEY,
  loja               TEXT NOT NULL,
  data               DATE NOT NULL,
  tipo_despesa_id    TEXT REFERENCES tipos_despesa(id) ON DELETE SET NULL,
  forma_pagamento_id TEXT REFERENCES formas_pagamento(id) ON DELETE SET NULL,
  banco_caixa_id     TEXT REFERENCES bancos_caixa(id) ON DELETE SET NULL,
  valor              NUMERIC NOT NULL DEFAULT 0,
  observacao         TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_despesa_loja ON despesa(loja);
CREATE INDEX IF NOT EXISTS idx_despesa_data ON despesa(loja, data DESC);

CREATE TABLE IF NOT EXISTS lancamento (
  id                  TEXT PRIMARY KEY,
  loja                TEXT NOT NULL,
  data                DATE NOT NULL,
  tipo_lancamento_id  TEXT REFERENCES tipos_lancamento(id) ON DELETE SET NULL,
  banco_caixa_id      TEXT REFERENCES bancos_caixa(id) ON DELETE SET NULL,
  descricao           TEXT NOT NULL DEFAULT '',
  valor               NUMERIC NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lancamento_loja ON lancamento(loja);
CREATE INDEX IF NOT EXISTS idx_lancamento_data ON lancamento(loja, data DESC);

-- Caixa: um registro por "fechamento" (data), com itens de dinheiro físico (bruto/trocados).
CREATE TABLE IF NOT EXISTS caixa_registro (
  id         TEXT PRIMARY KEY,
  loja       TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caixa_registro_loja ON caixa_registro(loja, updated_at DESC);

CREATE TABLE IF NOT EXISTS caixa_item (
  id                TEXT PRIMARY KEY,
  caixa_registro_id TEXT NOT NULL REFERENCES caixa_registro(id) ON DELETE CASCADE,
  grupo             TEXT NOT NULL CHECK (grupo IN ('bruto', 'trocados')),
  local             TEXT NOT NULL,
  valor             NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_caixa_item_registro ON caixa_item(caixa_registro_id);
