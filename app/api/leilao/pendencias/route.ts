import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

const PRODUTOS_EXCL = ['TARRACHA', 'COMPLEMENTO'];

const TR = (col: string) =>
  `translate(UPPER(${col}), 'ÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ', 'AAAAEEEIIIOOOOUUUC')`;

function normalizeDest(s: string): string {
  return s.toUpperCase().trim()
    .replace(/[ÁÀÂÃ]/g, 'A').replace(/[ÉÈÊ]/g, 'E')
    .replace(/[ÍÌÎ]/g, 'I').replace(/[ÓÒÔÕ]/g, 'O')
    .replace(/[ÚÙÛ]/g, 'U').replace(/Ç/g, 'C');
}

export async function POST(req: Request) {
  const body     = await req.json() as { destinos?: unknown };
  const destinos = Array.isArray(body.destinos) ? (body.destinos as string[]) : [];

  const client = await pool.connect();
  try {
    const params: string[] = [...PRODUTOS_EXCL];
    const prodHolders = PRODUTOS_EXCL.map((_, i) => `$${i + 1}`).join(', ');

    let destinoClause = '';
    if (destinos.length > 0) {
      const offset = params.length;
      params.push(...destinos.map(normalizeDest));
      const destHolders = destinos.map((_, i) => `$${offset + i + 1}`).join(', ');
      destinoClause = `AND (d.destino IS NULL OR ${TR('d.destino')} NOT IN (${destHolders}))`;
    }

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
         ${destinoClause}
         AND (
           pd.preco_avista IS NULL OR pd.preco_avista = 0
           OR (SELECT COUNT(*) FROM leilao_image li WHERE li."productDetailsId" = pd.id) < 6
           OR NOT EXISTS (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = true)
           OR NOT EXISTS (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.is_main = false)
         )
       ORDER BY pd.preco_avista ASC NULLS FIRST`,
      params,
    );

    return NextResponse.json({ data: rows });
  } finally {
    client.release();
  }
}
