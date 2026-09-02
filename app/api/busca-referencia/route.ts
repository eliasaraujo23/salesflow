import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth/require-auth';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  if (!process.env.PG_CONNECTION_STRING) {
    return NextResponse.json({ error: 'PG_CONNECTION_STRING não configurada.' }, { status: 500 });
  }

  const ref = req.nextUrl.searchParams.get('ref')?.trim().toUpperCase();
  if (!ref) {
    return NextResponse.json({ error: 'Parâmetro ref obrigatório.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         pd.referencia,
         pd.tipo,
         pd.custo_real,
         pd.preco_cobrado,
         pd.preco_parceiro,
         pd.preco_avista,
         pd.preco_parcelado,
         pd.peso,
         pd.diamantes,
         pd.cts_diamantes,
         pd.pedra_colorida,
         pd.cts_pedra_colorida,
         pd.descricao_jewel,
         pd."statusProdutoId" AS status_id,
         p.produto,
         s.subtipo,
         tp.tipo_pedra,
         l.lapidacao,
         d.destino
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN lapidacao  l  ON l.id  = pd."lapidacaoId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE UPPER(pd.referencia) = $1
       LIMIT 1`,
      [ref],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Referência não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
