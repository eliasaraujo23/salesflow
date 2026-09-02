-- Schema do banco dedicado a dados de app compartilhados (tasks, metais,
-- carros-chefe, fluxograma, brechós, leilão) — Neon Postgres, separado do
-- banco de auth e do banco de controle-lojas.
-- Rodar uma única vez no banco novo (APP_DATABASE_URL).
-- Não roda automaticamente — sem migrations geridas por ferramenta neste projeto.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tasks ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  person      TEXT NOT NULL,           -- personKey, não nome de exibição
  priority    TEXT NOT NULL,           -- sem CHECK ainda — confirmar enum real antes de travar
  status      TEXT NOT NULL,           -- sem CHECK ainda — confirmar enum real antes de travar
  due         TEXT NOT NULL,           -- mantém formato DD/MM/AAAA (texto), igual hoje
  late        INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_id   TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);

CREATE TABLE IF NOT EXISTS task_delete_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            TEXT NOT NULL,
  title              TEXT,
  requested_by       TEXT,
  requested_by_name  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_id          TEXT UNIQUE
);

-- ── Metais (globais — não confundir com metal_gtt/gti/24k/ci, já migrados
-- para o banco de Controle de Lojas) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metais_globais (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada','cadastro','antigo')),
  metal       TEXT NOT NULL CHECK (metal IN ('ouro','prata','platina')),
  chegou      NUMERIC NOT NULL,
  cadastrado  NUMERIC NOT NULL,
  sobrou      NUMERIC NOT NULL,
  peso        NUMERIC NOT NULL,
  origem      TEXT NOT NULL,
  data        TEXT NOT NULL,           -- mantém formato de texto, igual hoje
  obs         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_id   TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_metais_globais_created_at ON metais_globais (created_at DESC);

-- ── Carros-chefe ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carros_chefe (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT NOT NULL,
  produto     TEXT NOT NULL DEFAULT '',
  subtipo     TEXT NOT NULL DEFAULT '',
  tipo_pedra  TEXT NOT NULL DEFAULT '',
  lapidacao   TEXT NOT NULL DEFAULT '',
  "order"     INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_id   TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_carros_chefe_order ON carros_chefe ("order");

-- ── Fluxograma (singleton) ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxogramas (
  id          TEXT PRIMARY KEY DEFAULT 'empresa',
  nodes       JSONB NOT NULL DEFAULT '[]',
  edges       JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Brechós ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS breachos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  estado      TEXT NOT NULL,
  uf          TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_id   TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_breachos_nome ON breachos (nome);

-- ── Leilão ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leilao_leiloes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             TEXT NOT NULL,
  nome               TEXT NOT NULL,
  data_inicio        DATE NOT NULL,
  data_fim           DATE NOT NULL,
  cor                TEXT NOT NULL,
  codigo_plataforma  TEXT NOT NULL,
  observacao         TEXT,
  status             TEXT CHECK (status IN ('captando','convite','convite_catalogo','venda_pos_leilao','finalizado')),
  legacy_id          TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_leilao_leiloes_data_inicio ON leilao_leiloes (data_inicio ASC);

CREATE TABLE IF NOT EXISTS leilao_regras_destino (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destino TEXT NOT NULL UNIQUE,
  ativo   BOOLEAN NOT NULL DEFAULT true
);

-- Seed único dos 16 destinos padrão (substitui o auto-seed em runtime do Firestore)
INSERT INTO leilao_regras_destino (destino, ativo) VALUES
  ('Achados Perdidos', true), ('Agosto', true), ('Augusto', true), ('Brilho Vintage', true),
  ('Cadastro Pendente', true), ('Eduardo', true), ('Emerson Tijuca', true), ('Etiqueta Única', true),
  ('Gringa', true), ('Helton', true), ('Lohana Coelho', true), ('Louca por Joias', true),
  ('Lucimary', true), ('Pamela Ferrari', true), ('Retorno Scrap', true), ('Thais', true)
ON CONFLICT (destino) DO NOTHING;

CREATE TABLE IF NOT EXISTS leilao_bases_ativas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_plataforma  TEXT,
  filename           TEXT NOT NULL,
  count_pecas        INTEGER NOT NULL,
  refs               TEXT[] NOT NULL DEFAULT '{}',
  refs_vendidos      TEXT[] NOT NULL DEFAULT '{}',
  excluded           BOOLEAN NOT NULL DEFAULT false,
  price_per_ref      JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  legacy_id          TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_leilao_bases_ativas_created_at ON leilao_bases_ativas (created_at ASC);

-- ── Análise HT (planilhas de Histórico de Trabalho por loja/mês) ───────────
-- Formato de origem: CSV "AAAAMM_LOJA.csv" (G:\USUÁRIOS\ELIAS\Planilha HT).

CREATE TABLE IF NOT EXISTS analise_ht_uploads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    TEXT NOT NULL UNIQUE,
  loja        TEXT NOT NULL,
  ano_mes     TEXT NOT NULL,           -- "202608"
  row_count   INTEGER NOT NULL,
  uploaded_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analise_ht_registros (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id         UUID NOT NULL REFERENCES analise_ht_uploads(id) ON DELETE CASCADE,
  linha             INTEGER,
  cod_interno       TEXT,
  data              TEXT,              -- mantém "DD/MM/AAAA" cru, igual outras tabelas do projeto
  hora              TEXT,
  feedback          TEXT,
  preco             TEXT,
  motivo_nc         TEXT,
  transacao         TEXT,
  ouro_24k          NUMERIC NOT NULL DEFAULT 0,
  ouro_22k          NUMERIC NOT NULL DEFAULT 0,
  pt                NUMERIC NOT NULL DEFAULT 0,
  ouro_750          NUMERIC NOT NULL DEFAULT 0,
  ouro_720          NUMERIC NOT NULL DEFAULT 0,
  bx                NUMERIC NOT NULL DEFAULT 0,
  platina           NUMERIC NOT NULL DEFAULT 0,
  prata             NUMERIC NOT NULL DEFAULT 0,
  peso_total        NUMERIC NOT NULL DEFAULT 0,
  valor_gasto       NUMERIC NOT NULL DEFAULT 0,
  pago_por_grama    NUMERIC NOT NULL DEFAULT 0,
  observacao        TEXT,
  loja              TEXT,
  avaliador         TEXT
);

CREATE INDEX IF NOT EXISTS idx_analise_ht_registros_upload_id ON analise_ht_registros (upload_id);
CREATE INDEX IF NOT EXISTS idx_analise_ht_uploads_loja_ano_mes ON analise_ht_uploads (loja, ano_mes);

-- Tabela de premiação (1º/2º/3º lugar por faixa de pago/grama x peso),
-- editável pela aba "Config" de Análise HT. peso_max NULL = "acima de".
CREATE TABLE IF NOT EXISTS analise_ht_premiacao_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_lojas TEXT NOT NULL,          -- "GTT_PTQ_PGT_24K" (Tijuca/Taquara/Tijuquinha/Méier) | "GTI_CI" (Ipanema/Copacabana)
  valor_min   NUMERIC NOT NULL,
  valor_max   NUMERIC NOT NULL,
  peso_min    NUMERIC NOT NULL,
  peso_max    NUMERIC,                -- NULL = sem limite superior ("acima de")
  premio_1    NUMERIC NOT NULL,
  premio_2    NUMERIC NOT NULL,
  premio_3    NUMERIC NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analise_ht_premiacao_config_grupo ON analise_ht_premiacao_config (grupo_lojas);

-- Faixas de VALOR sem gap (30.01-40.00 etc. — número real). Faixas de PESO
-- usam limites inteiros (20/30/31/40/...) e são comparadas pela parte
-- inteira do peso (ver naFaixaPeso em lib/analise-ht/premiacao.ts): um peso
-- de 40,4g cai em "31-40" porque sua parte inteira (40) ainda pertence a
-- essa faixa, não em "41-50".
INSERT INTO analise_ht_premiacao_config (grupo_lojas, valor_min, valor_max, peso_min, peso_max, premio_1, premio_2, premio_3)
SELECT 'GTT_PTQ_PGT_24K', valor_min, valor_max, peso_min, peso_max, premio_1, premio_2, premio_3
FROM (VALUES
  (30.01, 40, 20, 30,   350,  175,      116.67),
  (30.01, 40, 31, 40,   400,  200,      133.33),
  (30.01, 40, 41, 50,   450,  225,      150.00),
  (30.01, 40, 51, NULL, 500,  250,      166.67),
  (20.01, 30, 20, 30,   550,  275,      183.33),
  (20.01, 30, 31, 40,   600,  300,      200.00),
  (20.01, 30, 41, 50,   650,  325,      216.67),
  (20.01, 30, 51, NULL, 700,  350,      233.33),
  (10.01, 20, 20, 30,   750,  375,      250.00),
  (10.01, 20, 31, 40,   800,  400,      266.67),
  (10.01, 20, 41, 50,   850,  425,      283.33),
  (10.01, 20, 51, NULL, 900,  450,      300.00),
  (0,     10, 20, 30,   950,  475,      316.67),
  (0,     10, 31, 40,   1000, 500,      333.33),
  (0,     10, 41, 50,   1050, 525,      350.00),
  (0,     10, 51, NULL, 1100, 550,      366.67)
) AS t(valor_min, valor_max, peso_min, peso_max, premio_1, premio_2, premio_3)
WHERE NOT EXISTS (SELECT 1 FROM analise_ht_premiacao_config WHERE grupo_lojas = 'GTT_PTQ_PGT_24K');

INSERT INTO analise_ht_premiacao_config (grupo_lojas, valor_min, valor_max, peso_min, peso_max, premio_1, premio_2, premio_3)
SELECT 'GTI_CI', valor_min, valor_max, peso_min, peso_max, premio_1, premio_2, premio_3
FROM (VALUES
  (40.01, 60, 20, 30,   350,  175,      116.67),
  (40.01, 60, 31, 40,   400,  200,      133.33),
  (40.01, 60, 41, 50,   450,  225,      150.00),
  (40.01, 60, 51, NULL, 500,  250,      166.67),
  (30.01, 40, 20, 30,   550,  275,      183.33),
  (30.01, 40, 31, 40,   600,  300,      200.00),
  (30.01, 40, 41, 50,   650,  325,      216.67),
  (30.01, 40, 51, NULL, 700,  350,      233.33),
  (20.01, 30, 20, 30,   750,  375,      250.00),
  (20.01, 30, 31, 40,   800,  400,      266.67),
  (20.01, 30, 41, 50,   850,  425,      283.33),
  (20.01, 30, 51, NULL, 900,  450,      300.00),
  (0,     20, 20, 30,   950,  475,      316.67),
  (0,     20, 31, 40,   1000, 500,      333.33),
  (0,     20, 41, 50,   1050, 525,      350.00),
  (0,     20, 51, NULL, 1100, 550,      366.67)
) AS t(valor_min, valor_max, peso_min, peso_max, premio_1, premio_2, premio_3)
WHERE NOT EXISTS (SELECT 1 FROM analise_ht_premiacao_config WHERE grupo_lojas = 'GTI_CI');

-- Metas e premiação por loja (ver conversa com Elias 2026-09-02). 4 metas
-- independentes por loja: peso comprado, pago/grama médio (abaixo de),
-- conversão, % de compras abaixo de um valor/grama. Se a loja bate uma
-- meta, TODA avaliadora "da loja" (ver analise_ht_loja_base) ganha o
-- prêmio cheio daquela meta (não dividido).
CREATE TABLE IF NOT EXISTS analise_ht_metas_loja (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loja                TEXT NOT NULL UNIQUE,
  meta_peso           NUMERIC NOT NULL DEFAULT 0,      -- gramas
  premio_peso         NUMERIC NOT NULL DEFAULT 0,
  meta_pago_grama     NUMERIC NOT NULL DEFAULT 0,      -- R$ (bate se média ficar abaixo)
  premio_pago_grama   NUMERIC NOT NULL DEFAULT 0,
  meta_conversao      NUMERIC NOT NULL DEFAULT 0,      -- 0-1
  premio_conversao    NUMERIC NOT NULL DEFAULT 0,
  limite_abaixo_250   NUMERIC NOT NULL DEFAULT 250,    -- R$ — corte da 4ª meta
  meta_abaixo_250     NUMERIC NOT NULL DEFAULT 0,      -- 0-1 — % de compras exigido abaixo do limite
  premio_abaixo_250   NUMERIC NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO analise_ht_metas_loja (loja, meta_peso, premio_peso, meta_pago_grama, premio_pago_grama, meta_conversao, premio_conversao, limite_abaixo_250, meta_abaixo_250, premio_abaixo_250)
VALUES
  ('GTT', 3700, 1000, 250, 1500, 0.89, 1000, 250, 0.55, 1000),
  ('GTI', 2400, 500,  270, 750,  0.91, 500,  250, 0.35, 750),
  ('24K', 1700, 500,  250, 750,  0.92, 500,  250, 0.55, 750),
  ('PCI', 500,  0,    300, 0,    0.85, 0,    250, 0.30, 0),
  ('PTQ', 500,  0,    250, 0,    0.85, 0,    250, 0.30, 0),
  ('PGT', 500,  0,    250, 0,    0.85, 0,    250, 0,    0)
ON CONFLICT (loja) DO NOTHING;

-- Loja base por avaliadora — atribuída manualmente arrastando num board
-- estilo Kanban (ver analise-ht/loja-base). Determina quem conta como "da
-- loja" para os bônus de meta batida.
CREATE TABLE IF NOT EXISTS analise_ht_loja_base (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliador   TEXT NOT NULL UNIQUE,
  loja        TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gratificação avulsa (ver conversa com Elias 2026-09-02) — lançamento
-- manual, pontual, vinculado ao upload/mês específico. Quem gerencia
-- escolhe a avaliadora e o valor; soma direto no Total a Pagar daquele mês.
-- upload_id é nulo para gratificação de gerente (ex: Raphael Borges), que
-- não é vinculada a uma loja específica — usa "referencia" (ex: "2026-09")
-- como chave de período no lugar do upload.
CREATE TABLE IF NOT EXISTS analise_ht_gratificacao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id   UUID REFERENCES analise_ht_uploads(id) ON DELETE CASCADE,
  referencia  TEXT,
  avaliador   TEXT NOT NULL,
  valor       NUMERIC NOT NULL DEFAULT 0,
  motivo      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((upload_id IS NOT NULL) OR (referencia IS NOT NULL))
);
-- Migração incremental (tabela já existente em produção antes da coluna
-- "referencia" e do upload_id opcional para gratificação de gerente):
ALTER TABLE analise_ht_gratificacao ALTER COLUMN upload_id DROP NOT NULL;
ALTER TABLE analise_ht_gratificacao ADD COLUMN IF NOT EXISTS referencia TEXT;
ALTER TABLE analise_ht_gratificacao DROP CONSTRAINT IF EXISTS analise_ht_gratificacao_upload_id_avaliador_key;
ALTER TABLE analise_ht_gratificacao DROP CONSTRAINT IF EXISTS analise_ht_gratificacao_check;
ALTER TABLE analise_ht_gratificacao ADD CONSTRAINT analise_ht_gratificacao_check
  CHECK ((upload_id IS NOT NULL) OR (referencia IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS analise_ht_gratificacao_upload_avaliador_uidx
  ON analise_ht_gratificacao (upload_id, avaliador) WHERE upload_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS analise_ht_gratificacao_referencia_avaliador_uidx
  ON analise_ht_gratificacao (referencia, avaliador) WHERE referencia IS NOT NULL;
