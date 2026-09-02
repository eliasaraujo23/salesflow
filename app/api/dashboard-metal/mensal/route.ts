import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { requireDashboardMetalAccess } from '@/lib/auth/require-auth';
import { REGISTRO_VALIDO_WHERE, METAL_OURO_EXPR } from '@/lib/dashboard-metal-sql';

export async function GET(req: NextRequest) {
  const access = await requireDashboardMetalAccess(req);
  if (!access.ok) return access.response;

  const loja = req.nextUrl.searchParams.get('loja'); // null/'TODAS' = todas as lojas
  const inicio = req.nextUrl.searchParams.get('inicio'); // 'YYYY-MM' ou 'YYYY-MM-DD'
  const fim = req.nextUrl.searchParams.get('fim'); // 'YYYY-MM' ou 'YYYY-MM-DD'

  const pool = getControleLojasPool();

  const params: unknown[] = [];
  const wheres = [REGISTRO_VALIDO_WHERE];

  if (loja && loja !== 'TODAS') {
    params.push(loja);
    wheres.push(`loja = $${params.length}`);
  }
  if (inicio) {
    params.push(inicio.length === 7 ? `${inicio}-01` : inicio);
    wheres.push(`data >= $${params.length}`);
  }
  if (fim) {
    if (fim.length === 7) {
      params.push(`${fim}-01`);
      wheres.push(`data < ($${params.length}::date + INTERVAL '1 month')`);
    } else {
      params.push(fim);
      wheres.push(`data <= $${params.length}`);
    }
  }

  const query = `
    SELECT
      loja,
      TO_CHAR(data, 'YYYY-MM') AS ano_mes,
      COUNT(*) AS aval_s4,
      COUNT(*) FILTER (WHERE transacao = 'COMPRA') AS compras,
      COUNT(*) FILTER (WHERE transacao = 'NAO_COMPRA') AS nc,
      COALESCE(SUM(total_peso) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal,
      COALESCE(SUM(ouro_750) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_750,
      COALESCE(SUM(ouro_720) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_720,
      COALESCE(SUM(bx) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_bx,
      COALESCE(SUM(ouro_24k) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_24k,
      COALESCE(SUM(ouro_22k) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_22k,
      COALESCE(SUM(pt) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_pt,
      COALESCE(SUM(platina) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_platina,
      COALESCE(SUM(prata) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal_prata,
      COALESCE(SUM(valor) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor,
      COALESCE(SUM(valor * ouro_750 / NULLIF(${METAL_OURO_EXPR}, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_750,
      COALESCE(SUM(valor * ouro_720 / NULLIF(${METAL_OURO_EXPR}, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_720,
      COALESCE(SUM(valor * bx / NULLIF(${METAL_OURO_EXPR}, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_bx,
      COALESCE(SUM(valor * ouro_24k / NULLIF(${METAL_OURO_EXPR}, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_24k,
      COALESCE(SUM(valor * ouro_22k / NULLIF(${METAL_OURO_EXPR}, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_22k,
      COALESCE(SUM(valor * pt / NULLIF(${METAL_OURO_EXPR}, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_pt,
      COALESCE(SUM(valor * platina / NULLIF(${METAL_OURO_EXPR}, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_platina,
      COALESCE(SUM(valor * prata / NULLIF(total_peso, 0)) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor_prata,
      COALESCE(SUM(valor) FILTER (WHERE transacao = 'COMPRA' AND ${METAL_OURO_EXPR} > 0), 0) AS ticket_sum,
      COUNT(*) FILTER (WHERE transacao = 'COMPRA' AND ${METAL_OURO_EXPR} > 0) AS ticket_cnt
    FROM metal
    WHERE ${wheres.join(' AND ')}
    GROUP BY loja, TO_CHAR(data, 'YYYY-MM')
    ORDER BY ano_mes ASC, loja ASC
  `;

  const result = await pool.query(query, params);

  const rows = result.rows.map(r => ({
    loja: r.loja,
    ano_mes: r.ano_mes,
    aval_s4: Number(r.aval_s4),
    compras: Number(r.compras),
    nc: Number(r.nc),
    conv: Number(r.aval_s4) > 0 ? Number(r.compras) / Number(r.aval_s4) : 0,
    metal: Number(r.metal),
    metal_750: Number(r.metal_750),
    metal_720: Number(r.metal_720),
    metal_bx: Number(r.metal_bx),
    metal_24k: Number(r.metal_24k),
    metal_22k: Number(r.metal_22k),
    metal_pt: Number(r.metal_pt),
    metal_platina: Number(r.metal_platina),
    metal_prata: Number(r.metal_prata),
    valor: Number(r.valor),
    valor_750: Number(r.valor_750),
    valor_720: Number(r.valor_720),
    valor_bx: Number(r.valor_bx),
    valor_24k: Number(r.valor_24k),
    valor_22k: Number(r.valor_22k),
    valor_pt: Number(r.valor_pt),
    valor_platina: Number(r.valor_platina),
    valor_prata: Number(r.valor_prata),
    ticket_medio: Number(r.ticket_cnt) > 0 ? Number(r.ticket_sum) / Number(r.ticket_cnt) : 0,
    ticket_sum: Number(r.ticket_sum),
    ticket_cnt: Number(r.ticket_cnt),
  }));

  return NextResponse.json({ data: rows });
}
