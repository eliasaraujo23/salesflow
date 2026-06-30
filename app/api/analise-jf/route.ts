import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

export async function GET() {
  if (!process.env.PG_CONNECTION_STRING) {
    return NextResponse.json({ error: 'PG_CONNECTION_STRING não configurada no ambiente.' }, { status: 500 });
  }
  const client = await pool.connect();
  try {
    const SOLD = `pd."statusProdutoId" IN (2, 4, 13)`;

    const [kpisRes, rankingRes, tipoRes, pedraRes] = await Promise.all([
      client.query(`
        SELECT
          COUNT(*)                        AS total,
          ROUND(SUM(pd.preco_cobrado))    AS faturamento,
          ROUND(AVG(pd.preco_cobrado))    AS ticket_medio
        FROM product_details pd
        WHERE pd.tipo = 'JF' AND ${SOLD}
      `),
      client.query(`
        SELECT
          p.produto                   AS tj,
          s.subtipo                   AS sub,
          tp.tipo_pedra               AS pedra,
          COUNT(*)                    AS q,
          ROUND(AVG(pd.preco_cobrado)) AS ticket,
          ROUND(SUM(pd.preco_cobrado)) AS fat
        FROM product_details pd
        JOIN produto     p  ON p.id  = pd."produtoId"
        JOIN subtipo     s  ON s.id  = pd."subtipoId"
        JOIN tipo_pedra  tp ON tp.id = pd."tipoPedraId"
        WHERE pd.tipo = 'JF' AND ${SOLD}
        GROUP BY p.produto, s.subtipo, tp.tipo_pedra
        ORDER BY q DESC
        LIMIT 30
      `),
      client.query(`
        SELECT p.produto, COUNT(*) AS q
        FROM product_details pd
        JOIN produto p ON p.id = pd."produtoId"
        WHERE pd.tipo = 'JF' AND ${SOLD}
        GROUP BY p.produto ORDER BY q DESC LIMIT 12
      `),
      client.query(`
        SELECT tp.tipo_pedra, COUNT(*) AS q
        FROM product_details pd
        JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
        WHERE pd.tipo = 'JF' AND ${SOLD}
        GROUP BY tp.tipo_pedra ORDER BY q DESC LIMIT 10
      `),
    ]);

    return NextResponse.json({
      kpis: kpisRes.rows[0],
      ranking: rankingRes.rows,
      por_tipo: tipoRes.rows,
      por_pedra: pedraRes.rows,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
