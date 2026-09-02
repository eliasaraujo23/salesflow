-- Migra motivos_nc de id slugificado para id numérico (ordem exata da tb_ncompra do Access legado).
-- Rodar uma única vez.

BEGIN;

ALTER TABLE motivos_nc ADD COLUMN IF NOT EXISTS ordem INTEGER;

-- Remove temporariamente a FK para poder trocar os ids sem violar a integridade
-- referencial durante a transição (é recriada ao final).
ALTER TABLE metal DROP CONSTRAINT IF EXISTS metal_feedback_nc_id_fkey;

DELETE FROM motivos_nc;

INSERT INTO motivos_nc (id, nome, ordem) VALUES
  ('1',  'MELHOR PREÇO CONCORRENTE',       1),
  ('2',  'IMAGINA PREÇO MELHOR',           2),
  ('3',  'ELO EMOCIONAL',                  3),
  ('4',  'BIJUTERIA',                      4),
  ('5',  'PEÇA DE TERCEIROS',              5),
  ('6',  'NÃO DEIXOU LIMAR',               6),
  ('7',  'IMAGINA PREÇO ACIMA DA COTAÇÃO', 7),
  ('8',  'PESQUISANDO PREÇO',              8),
  ('9',  'SEM DOCUMENTOS',                 9),
  ('10', 'NÃO QUIS ASSINAR',               10),
  ('11', 'DISPENSADO',                     11);

-- Mapa antigo (slug) -> novo (numero), na ordem RESUMO da tb_ncompra
UPDATE metal SET feedback_nc_id = '1'  WHERE feedback_nc_id = 'melhor-preco-concorrente';
UPDATE metal SET feedback_nc_id = '2'  WHERE feedback_nc_id = 'imagina-preco-melhor';
UPDATE metal SET feedback_nc_id = '3'  WHERE feedback_nc_id = 'elo-emocional';
UPDATE metal SET feedback_nc_id = '4'  WHERE feedback_nc_id = 'bijuteria';
UPDATE metal SET feedback_nc_id = '5'  WHERE feedback_nc_id = 'peca-de-terceiros';
UPDATE metal SET feedback_nc_id = '6'  WHERE feedback_nc_id = 'nao-deixou-limar';
UPDATE metal SET feedback_nc_id = '7'  WHERE feedback_nc_id = 'imagina-preco-acima-da-cotacao';
UPDATE metal SET feedback_nc_id = '8'  WHERE feedback_nc_id = 'pesquisando-preco';
UPDATE metal SET feedback_nc_id = '9'  WHERE feedback_nc_id = 'sem-documentos';
UPDATE metal SET feedback_nc_id = '10' WHERE feedback_nc_id = 'nao-quis-assinar';
UPDATE metal SET feedback_nc_id = '11' WHERE feedback_nc_id = 'dispensado';

ALTER TABLE metal
  ADD CONSTRAINT metal_feedback_nc_id_fkey
  FOREIGN KEY (feedback_nc_id) REFERENCES motivos_nc(id) ON DELETE SET NULL;

COMMIT;
