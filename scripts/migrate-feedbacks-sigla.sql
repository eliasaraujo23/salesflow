-- Recria feedbacks_compra com a SIGLA do Access como id (em vez de slug do nome).
-- Fonte: listas enviadas pelo usuário, extraídas das tb_metal_* do Access legado.

BEGIN;

-- Remove FK temporariamente (feedback_id não tem FK declarada hoje, mas por segurança
-- garantimos que não há conflito ao truncar).
DELETE FROM feedbacks_compra;

-- GTT (Tijuca) — 38 itens
INSERT INTO feedbacks_compra (id, loja, nome) VALUES
  ('45',   'gtt', 'SHOPPING 45'),
  ('AK',   'gtt', 'AMIGO KIDS'),
  ('BF',   'gtt', 'BANCA FLORES'),
  ('BLF',  'gtt', 'BELA FERRAZ'),
  ('BM',   'gtt', 'BANCA MUNDIAL'),
  ('BE',   'gtt', 'BANCA EXTRA'),
  ('BP',   'gtt', 'BANCA PACHECO'),
  ('BU',   'gtt', 'BANCA URUGUAI'),
  ('C',    'gtt', 'COMERCIANTE'),
  ('COC',  'gtt', 'COMBRINDO OFERTA'),
  ('CP',   'gtt', 'CASA DO PÃO'),
  ('BC',   'gtt', 'BANCA CAIXA'),
  ('G',    'gtt', 'GOOGLE'),
  ('I',    'gtt', 'INDICAÇÃO'),
  ('ICB',  'gtt', 'IGREJA CONDE DE BONFIM'),
  ('ICB2', 'gtt', 'IGREJA 2'),
  ('IE',   'gtt', 'INDICAÇÃO EMERSON'),
  ('IG',   'gtt', 'INSTAGRAM'),
  ('L',    'gtt', 'LOJA'),
  ('LG',   'gtt', 'LUIDGI'),
  ('LT',   'gtt', 'LIRITY'),
  ('MFL',  'gtt', 'MOCHILA FLORES'),
  ('MG',   'gtt', 'MAGAZINE'),
  ('MPC',  'gtt', 'MOCHILA PACHECO'),
  ('MPC2', 'gtt', 'PACHECO 2'),
  ('MP',   'gtt', 'MOCHILA PORTA'),
  ('MV',   'gtt', 'MOCHILA VENANCIO'),
  ('NSD',  'gtt', 'NÃO SABE DIZER'),
  ('O',    'gtt', 'OTTO'),
  ('P',    'gtt', 'PORTA'),
  ('P215', 'gtt', 'PORTA SANTO AFONSO'),
  ('PC',   'gtt', 'PROPAGANDA CONCORRENTE'),
  ('PDP',  'gtt', 'PERNA DE PAU'),
  ('PLM',  'gtt', 'PLANETA MULHER'),
  ('PP',   'gtt', 'PROPAGANDA POSTE'),
  ('R',    'gtt', 'RETORNO'),
  ('SF',   'gtt', 'SEM FEEDBACK'),
  ('SM',   'gtt', 'SUMMER'),
  ('Tx',   'gtt', 'TAXI');

-- 24K (Méier) — 28 itens
INSERT INTO feedbacks_compra (id, loja, nome) VALUES
  ('AC',  '24k', 'ARMADILHA DO CORPO'),
  ('BA',  '24k', 'BANCA ASSAÍ'),
  ('BC',  '24k', 'BANCA CARTÓRIO'),
  ('BCP', '24k', 'BANCA CASA PEDRO'),
  ('BE',  '24k', 'BELISSIMA'),
  ('BF',  '24k', 'BANCA FÓRUM'),
  ('BG',  '24k', 'BAGAGIO'),
  ('BP',  '24k', 'BANCA PERNAMBUCANAS'),
  ('BPP', '24k', 'BANCA PIZZARIA PARMÊ'),
  ('CP',  '24k', 'CASA PEDRO'),
  ('EXP', '24k', 'EX PADARIA IMPERATOR'),
  ('F',   '24k', 'FAIXA'),
  ('G',   '24k', 'GOOGLE'),
  ('GT',  '24k', 'GRÃO DE TERRA'),
  ('HA',  '24k', 'HABITUAL'),
  ('I',   '24k', 'INDICAÇÃO'),
  ('JMH', '24k', 'JORNAL MEIA HORA'),
  ('L',   '24k', 'LOJA'),
  ('MI',  '24k', 'MOCHILA IMPERATOR'),
  ('ND',  '24k', 'NOSSA DROGARIA'),
  ('O',   '24k', 'OBJETIVA'),
  ('OX',  '24k', 'OXFORD'),
  ('P',   '24k', 'PORTA'),
  ('PC',  '24k', 'PACHECO'),
  ('PR',  '24k', 'PRAÇA'),
  ('R',   '24k', 'RETORNO'),
  ('SF',  '24k', 'SEM FEEDBACK'),
  ('SM',  '24k', 'SHOPPING MEIER'),
  ('V',   '24k', 'VENÂNCIO');

-- GTI (Ipanema) — 28 itens
INSERT INTO feedbacks_compra (id, loja, nome) VALUES
  ('M',   'gti', 'METRÔ'),
  ('H',   'gti', 'HIDRANTE'),
  ('MH',  'gti', 'MOCHILA HSTERN'),
  ('V',   'gti', 'VENÂNCIO'),
  ('R',   'gti', 'RETORNO'),
  ('BH',  'gti', 'BANCA HSTERN'),
  ('BP',  'gti', 'BANCA PORTA'),
  ('BBB', 'gti', 'BANCA BANCO DO BRASIL'),
  ('BO',  'gti', 'BANCO ORIGINAL'),
  ('I',   'gti', 'INDICAÇÃO'),
  ('COM', 'gti', 'COMERCIANTE'),
  ('SF',  'gti', 'SEM FEEDBACK'),
  ('ND',  'gti', 'NOSSA DROGARIA'),
  ('P',   'gti', 'PORTA'),
  ('L',   'gti', 'LOJA'),
  ('ZS',  'gti', 'ZONA SUL'),
  ('FX',  'gti', 'FAIXA METRÔ'),
  ('C',   'gti', 'CORREIOS'),
  ('CV',  'gti', 'CASA E VIDEO'),
  ('G',   'gti', 'GOOGLE'),
  ('DM',  'gti', 'DROGAS MIL'),
  ('B3B', 'gti', 'BANCA'),
  ('A',   'gti', 'ADDIDAS'),
  ('T',   'gti', 'TACO'),
  ('HS',  'gti', 'HSTERN'),
  ('P2',  'gti', 'PORTA 2'),
  ('S',   'gti', 'SORVETERIA'),
  ('550', 'gti', '550');

-- CI (Copanema) — 8 itens
INSERT INTO feedbacks_compra (id, loja, nome) VALUES
  ('L',  'ci', 'LOJA'),
  ('I',  'ci', 'INDICAÇÃO'),
  ('EZ', 'ci', 'ESQUINA ZONA SUL'),
  ('G',  'ci', 'GOOGLE'),
  ('R',  'ci', 'RETORNO'),
  ('P',  'ci', 'PORTA'),
  ('EL', 'ci', 'LAMEGO'),
  ('SM', 'ci', 'SMARTFIT');

-- PTQ (Taquara) — 8 itens
INSERT INTO feedbacks_compra (id, loja, nome) VALUES
  ('ES', 'ptq', 'ESCOLA'),
  ('G',  'ptq', 'GOOGLE'),
  ('I',  'ptq', 'INDICAÇÃO'),
  ('L',  'ptq', 'LOJA'),
  ('PA', 'ptq', 'PASTEL'),
  ('P',  'ptq', 'PORTA'),
  ('PO', 'ptq', 'PORTA 2'),
  ('R',  'ptq', 'RETORNO');

-- PGT (Premier Gold Tijuca) — 13 itens
INSERT INTO feedbacks_compra (id, loja, nome) VALUES
  ('L',    'pgt', 'LOJA'),
  ('I',    'pgt', 'INDICAÇÃO'),
  ('PA',   'pgt', 'PASTEL'),
  ('G',    'pgt', 'GOOGLE'),
  ('R',    'pgt', 'RETORNO'),
  ('P',    'pgt', 'PORTA'),
  ('AM',   'pgt', 'AMIGÃO'),
  ('IT',   'pgt', 'ITAÚ'),
  ('B',    'pgt', 'BELISSIMA'),
  ('OT',   'pgt', 'OFFICE TIJUCA'),
  ('ST',   'pgt', 'SHOPPING TIJUCA'),
  ('RS',   'pgt', 'RICCOS'),
  ('DIBA', 'pgt', 'DIBA');

-- Migra o único registro de teste que referenciava o slug antigo 'retorno' -> sigla 'R'
UPDATE metal SET feedback_id = 'R' WHERE loja = 'gtt' AND feedback_id = 'retorno';

COMMIT;
