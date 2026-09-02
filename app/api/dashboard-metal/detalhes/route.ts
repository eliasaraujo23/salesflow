import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { requireDashboardMetalAccess } from '@/lib/auth/require-auth';
import { REGISTRO_VALIDO_WHERE, METAL_OURO_EXPR } from '@/lib/dashboard-metal-sql';

function buildWhere(loja: string | null, inicio: string | null, fim: string | null) {
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

  return { where: wheres.join(' AND '), params };
}

export async function GET(req: NextRequest) {
  const access = await requireDashboardMetalAccess(req);
  if (!access.ok) return access.response;

  const loja = req.nextUrl.searchParams.get('loja');
  const inicio = req.nextUrl.searchParams.get('inicio');
  const fim = req.nextUrl.searchParams.get('fim');

  const pool = getControleLojasPool();
  const { where, params } = buildWhere(loja, inicio, fim);

  const [valorPorLoja, feedback, motivoNc, horario, avaliadores, precoAvaliador, avaliadorMensal, avaliadorHorario] = await Promise.all([
    // Valor investido por mês, por loja (para gráfico empilhado)
    pool.query(
      `SELECT loja, TO_CHAR(data, 'YYYY-MM') AS ano_mes,
              COALESCE(SUM(valor) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor
       FROM metal
       WHERE ${where}
       GROUP BY loja, TO_CHAR(data, 'YYYY-MM')
       ORDER BY ano_mes ASC, loja ASC`,
      params
    ),

    // Feedback: conversão por sigla (todos os atendimentos, não só compra).
    // A descrição (nome) é resolvida preferindo a loja filtrada e caindo para qualquer
    // outra loja que tenha essa sigla cadastrada, replicando o comportamento do legado.
    pool.query(
      `SELECT m.feedback_id,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE m.transacao = 'COMPRA') AS compras,
              COALESCE(SUM(m.total_peso) FILTER (WHERE m.transacao = 'COMPRA'), 0) AS metal,
              (
                SELECT f.nome FROM feedbacks_compra f
                WHERE f.id = m.feedback_id
                ORDER BY (f.loja = $${params.length + 1}) DESC, f.loja ASC
                LIMIT 1
              ) AS descricao
       FROM metal m
       WHERE ${where} AND m.feedback_id IS NOT NULL AND m.feedback_id <> ''
       GROUP BY m.feedback_id
       HAVING COUNT(*) FILTER (WHERE m.transacao = 'COMPRA') > 0
       ORDER BY total DESC`,
      [...params, loja ?? '']
    ),

    // Motivo de não compra: contagem, peso perdido, valor
    pool.query(
      `SELECT feedback_nc_id AS cod, COUNT(*) AS total,
              COALESCE(SUM(${METAL_OURO_EXPR}), 0) AS peso
       FROM metal
       WHERE ${where} AND transacao = 'NAO_COMPRA' AND feedback_nc_id IS NOT NULL
       GROUP BY feedback_nc_id
       ORDER BY total DESC`,
      params
    ),

    // Movimentação por horário, slots de 30 minutos
    pool.query(
      `SELECT
         (EXTRACT(HOUR FROM hora::time)::int * 60 + (EXTRACT(MINUTE FROM hora::time)::int / 30) * 30) AS slot,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE transacao = 'COMPRA') AS compras
       FROM metal
       WHERE ${where} AND hora IS NOT NULL AND hora <> ''
       GROUP BY slot
       ORDER BY slot ASC`,
      params
    ),

    // Desempenho por avaliador (desagrega o array avaliadores, resolve o nome de exibição)
    pool.query(
      `SELECT av AS avaliador_id, COALESCE(a.nome, av) AS avaliador, loja,
              COALESCE(a.ativo, true) AS ativo,
              COUNT(*) AS aval,
              COUNT(*) FILTER (WHERE transacao = 'COMPRA') AS compras,
              COALESCE(SUM(total_peso) FILTER (WHERE transacao = 'COMPRA'), 0) AS metal,
              COALESCE(SUM(valor) FILTER (WHERE transacao = 'COMPRA'), 0) AS valor,
              COALESCE(SUM(ouro_750) FILTER (WHERE transacao = 'COMPRA'), 0) AS m750,
              COALESCE(SUM(ouro_720) FILTER (WHERE transacao = 'COMPRA'), 0) AS m720,
              COALESCE(SUM(bx) FILTER (WHERE transacao = 'COMPRA'), 0) AS mbx,
              COALESCE(SUM(ouro_22k) FILTER (WHERE transacao = 'COMPRA'), 0) AS m22k,
              COALESCE(SUM(pt + platina) FILTER (WHERE transacao = 'COMPRA'), 0) AS mpt,
              COALESCE(SUM(ouro_24k) FILTER (WHERE transacao = 'COMPRA'), 0) AS m24k
       FROM metal, UNNEST(avaliadores) AS av
       LEFT JOIN avaliadores a ON a.id = av
       WHERE ${where}
       GROUP BY av, a.nome, a.ativo, loja
       ORDER BY avaliador ASC, loja ASC`,
      params
    ),

    // Preço por avaliador e nível de preço ofertado (1º-5º)
    pool.query(
      `SELECT av AS avaliador_id, COALESCE(a.nome, av) AS avaliador, loja, preco::text AS nivel,
              COUNT(*) AS n,
              COALESCE(SUM(pago_por_grama), 0) AS soma_ppg
       FROM metal, UNNEST(avaliadores) AS av
       LEFT JOIN avaliadores a ON a.id = av
       WHERE ${where} AND transacao = 'COMPRA' AND pago_por_grama > 0
       GROUP BY av, a.nome, loja, preco
       ORDER BY avaliador ASC, loja ASC`,
      params
    ),

    // Conversão mensal por avaliador (para o gráfico de linha no painel de detalhe)
    pool.query(
      `SELECT av AS avaliador_id, COALESCE(a.nome, av) AS avaliador, TO_CHAR(data, 'YYYY-MM') AS ano_mes,
              COUNT(*) AS aval,
              COUNT(*) FILTER (WHERE transacao = 'COMPRA') AS compras
       FROM metal, UNNEST(avaliadores) AS av
       LEFT JOIN avaliadores a ON a.id = av
       WHERE ${where}
       GROUP BY av, a.nome, TO_CHAR(data, 'YYYY-MM')
       ORDER BY avaliador ASC, ano_mes ASC`,
      params
    ),

    // Movimentação por horário por avaliador (para o painel de detalhe)
    pool.query(
      `SELECT av AS avaliador_id, COALESCE(a.nome, av) AS avaliador,
              (EXTRACT(HOUR FROM hora::time)::int * 60 + (EXTRACT(MINUTE FROM hora::time)::int / 30) * 30) AS slot,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE transacao = 'COMPRA') AS compras
       FROM metal, UNNEST(avaliadores) AS av
       LEFT JOIN avaliadores a ON a.id = av
       WHERE ${where} AND hora IS NOT NULL AND hora <> ''
       GROUP BY av, a.nome, slot
       ORDER BY avaliador ASC, slot ASC`,
      params
    ),
  ]);

  return NextResponse.json({
    data: {
      valorPorLoja: valorPorLoja.rows.map(r => ({
        loja: r.loja,
        ano_mes: r.ano_mes,
        valor: Number(r.valor),
      })),
      feedback: feedback.rows.map(r => ({
        feedback_id: r.feedback_id as string,
        descricao: (r.descricao as string | null) ?? null,
        total: Number(r.total),
        compras: Number(r.compras),
        metal: Number(r.metal),
      })),
      motivoNc: motivoNc.rows.map(r => ({
        cod: r.cod as string,
        total: Number(r.total),
        peso: Number(r.peso),
      })),
      horario: horario.rows.map(r => ({
        slot: Number(r.slot),
        total: Number(r.total),
        compras: Number(r.compras),
      })),
      avaliadores: avaliadores.rows.map(r => ({
        avaliador_id: r.avaliador_id as string,
        avaliador: r.avaliador as string,
        loja: r.loja as string,
        ativo: Boolean(r.ativo),
        aval: Number(r.aval),
        compras: Number(r.compras),
        metal: Number(r.metal),
        valor: Number(r.valor),
        m750: Number(r.m750),
        m720: Number(r.m720),
        mbx: Number(r.mbx),
        m22k: Number(r.m22k),
        mpt: Number(r.mpt),
        m24k: Number(r.m24k),
      })),
      precoAvaliador: precoAvaliador.rows.map(r => ({
        avaliador_id: r.avaliador_id as string,
        avaliador: r.avaliador as string,
        loja: r.loja as string,
        nivel: r.nivel as string,
        n: Number(r.n),
        somaPpg: Number(r.soma_ppg),
      })),
      avaliadorMensal: avaliadorMensal.rows.map(r => ({
        avaliador_id: r.avaliador_id as string,
        avaliador: r.avaliador as string,
        ano_mes: r.ano_mes as string,
        aval: Number(r.aval),
        compras: Number(r.compras),
      })),
      avaliadorHorario: avaliadorHorario.rows.map(r => ({
        avaliador_id: r.avaliador_id as string,
        avaliador: r.avaliador as string,
        slot: Number(r.slot),
        total: Number(r.total),
        compras: Number(r.compras),
      })),
    },
  });
}
