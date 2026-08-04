import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

const DESTINOS_EXCL = [
  'GRINGA', 'ETIQUETA UNICA', 'ACHADOS PERDIDOS', 'BRILHO VINTAGE',
  'LOHANA COELHO', 'LOUCA POR JOIAS', 'LUCIMARY', 'HELTON', 'EDUARDO',
  'THAIS', 'AGOSTO', 'AUGUSTO', 'PAMELA FERRARI', 'CADASTRO PENDENTE', 'RETORNO SCRAP',
  'EMERSON TIJUCA',
];

const PRODUTOS_EXCL = ['TARRACHA', 'COMPLEMENTO'];

const TR = (col: string) =>
  `translate(UPPER(${col}), 'ÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ', 'AAAAEEEIIIOOOOUUUC')`;

export async function GET() {
  const n = DESTINOS_EXCL.length;
  const destHolders = DESTINOS_EXCL.map((_, i) => `$${i + 1}`).join(', ');
  const prodHolders = PRODUTOS_EXCL.map((_, i) => `$${n + i + 1}`).join(', ');

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT
         pd.referencia,
         pd.descricao_jewel,
         pd.preco_avista::float8    AS preco_avista,
         pd."statusProdutoId"       AS status_id,
         d.destino,
         p.produto,
         (SELECT COUNT(*)::int FROM leilao_image li WHERE li."productDetailsId" = pd.id)                              AS fotos,
         (SELECT COUNT(*)::int FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = true)        AS fotos_principal,
         (SELECT COUNT(*)::int FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = false)       AS fotos_secundaria
       FROM product_details pd
       LEFT JOIN produto  p ON p.id = pd."produtoId"
       LEFT JOIN destinos d ON d.id = pd."destinoId"
       WHERE pd."statusProdutoId" IN (3, 6)
         AND pd."destinoManutencaoId" IS NULL
         AND pd."statusManutencaoId" IS NULL
         AND (p.produto IS NULL OR ${TR('p.produto')} NOT IN (${prodHolders}))
         AND (d.destino IS NULL OR ${TR('d.destino')} NOT IN (${destHolders}))
         AND (
           pd.preco_avista IS NULL OR pd.preco_avista = 0
           OR (SELECT COUNT(*) FROM leilao_image li WHERE li."productDetailsId" = pd.id) < 6
           OR NOT EXISTS (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = true)
           OR NOT EXISTS (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = false)
         )
       ORDER BY pd.preco_avista ASC NULLS FIRST`,
      [...DESTINOS_EXCL, ...PRODUTOS_EXCL],
    );

    return NextResponse.json({ data: rows });
  } finally {
    client.release();
  }
}
