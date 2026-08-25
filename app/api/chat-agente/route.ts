import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { CC_DEFAULTS } from '@/lib/actions/carros-chefe';

export const maxDuration = 60;

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

const anthropic = new Anthropic();

const STATUS_VENDIDA = [2, 4, 13];

function fmt(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function capitalize(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function stemKw(w: string): string {
  if (w.length > 5 && w.endsWith('ares')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('eis')) return w.slice(0, -3) + 'el';
  if (w.length > 4 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

const normDiacritics = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Tipos ────────────────────────────────────────────────────────────────────

type DestRow = {
  produto: string | null;
  subtipo: string | null;
  tipo_pedra: string | null;
  lapidacao: string | null;
};

// ── DB: consulta por referência ──────────────────────────────────────────────

async function queryRef(ref: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         pd.referencia, pd.tipo, pd.custo_real, pd.preco_cobrado,
         pd.preco_parceiro, pd.preco_avista, pd.preco_parcelado,
         pd.peso, pd.diamantes, pd.cts_diamantes, pd.pedra_colorida, pd.cts_pedra_colorida,
         pd.tamanho, pd.descricao_jewel, pd."statusProdutoId" AS status_id,
         p.produto, s.subtipo, tp.tipo_pedra, l.lapidacao, d.destino,
         f."valorTotal" AS valor_total_financeiro
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN lapidacao  l  ON l.id  = pd."lapidacaoId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       LEFT JOIN financeiro f  ON f.id  = pd."financeiroId"
       WHERE UPPER(pd.referencia) = $1
       LIMIT 1`,
      [ref.toUpperCase()],
    );
    const row = result.rows[0] ?? null;
    if (!row) return { encontrado: false as const };

    const vendida = row.status_id != null && STATUS_VENDIDA.includes(row.status_id);
    const valorVenda = row.valor_total_financeiro ?? row.preco_cobrado;
    return {
      encontrado: true as const,
      referencia: row.referencia,
      tipo: row.tipo,
      produto: row.produto,
      subtipo: row.subtipo,
      tipo_pedra: row.tipo_pedra,
      lapidacao: row.lapidacao,
      tamanho: row.tamanho,
      descricao: row.descricao_jewel,
      peso: row.peso,
      diamantes: row.diamantes,
      cts_diamantes: row.cts_diamantes,
      pedra_colorida: row.pedra_colorida,
      cts_pedra_colorida: row.cts_pedra_colorida,
      vendida,
      destino: row.destino,
      custo: fmt(row.custo_real),
      // valor efetivamente pago (tabela financeiro), com fallback pro preço da ficha quando não houver acordo financeiro
      preco_cobrado: fmt(valorVenda),
      preco_parceiro: vendida ? null : fmt(row.preco_parceiro),
      preco_avista: vendida ? null : fmt(row.preco_avista),
      preco_parcelado: vendida ? null : fmt(row.preco_parcelado),
    };
  } finally {
    client.release();
  }
}

// ── DB: carros chefe ─────────────────────────────────────────────────────────

function matchesCC(cc: (typeof CC_DEFAULTS)[0], row: DestRow): boolean {
  const n = (s: string | null | undefined) => (s ?? '').toLowerCase().trim();
  if (cc.produto && !n(row.produto).includes(n(cc.produto))) return false;
  if (cc.subtipo && n(row.subtipo) !== n(cc.subtipo)) return false;
  if (cc.tipo_pedra && n(row.tipo_pedra) !== n(cc.tipo_pedra)) return false;
  if (cc.lapidacao && n(row.lapidacao) !== n(cc.lapidacao)) return false;
  return true;
}

async function listarCarrosChefe() {
  return { carros_chefe: CC_DEFAULTS.map(c => c.label) };
}

async function checkCarrosChefeDestino(destinoTerm: string) {
  const client = await pool.connect();
  try {
    const destRes = await client.query<{ destino: string }>(
      `SELECT DISTINCT d.destino FROM destinos d WHERE LOWER(d.destino) LIKE $1 ORDER BY d.destino LIMIT 5`,
      [`%${normDiacritics(destinoTerm)}%`],
    );
    if (destRes.rows.length === 0) {
      return { destino_encontrado: false as const };
    }
    const destinos = destRes.rows.map(r => r.destino);
    const destino = destinos.sort((a, b) => a.length - b.length)[0];

    const piecesRes = await client.query<DestRow>(
      `SELECT p.produto, s.subtipo, tp.tipo_pedra, l.lapidacao
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN lapidacao  l  ON l.id  = pd."lapidacaoId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE pd."statusProdutoId" IN (3, 6) AND LOWER(d.destino) = LOWER($1)`,
      [destino],
    );

    const covered = new Set<number>();
    for (const row of piecesRes.rows) {
      for (let i = 0; i < CC_DEFAULTS.length; i++) {
        if (matchesCC(CC_DEFAULTS[i], row)) covered.add(i);
      }
    }
    const missing = CC_DEFAULTS.filter((_, i) => !covered.has(i)).map(c => c.label);

    return {
      destino_encontrado: true as const,
      destino: capitalize(destino),
      outros_destinos_similares: destinos.slice(1).map(capitalize),
      total_carros_chefe: CC_DEFAULTS.length,
      cobertos: covered.size,
      faltando: missing,
    };
  } finally {
    client.release();
  }
}

function buscarCarrosChefePorTermo(termo: string) {
  const norm = normDiacritics;
  const t = norm(termo.trim());
  if (!t) return { carros_chefe: CC_DEFAULTS.map(c => c.label) };

  const found = CC_DEFAULTS.filter(c =>
    norm(c.label).includes(t) || norm(c.subtipo).includes(t) ||
    norm(c.produto).includes(t) || norm(c.tipo_pedra).includes(t),
  );
  if (found.length > 0) return { carros_chefe: found.map(c => c.label) };

  const palavras = t.split(/\s+/).filter(p => p.length > 2);
  const partial = CC_DEFAULTS.filter(c =>
    palavras.every(p =>
      norm(c.label).includes(p) || norm(c.subtipo).includes(p) ||
      norm(c.produto).includes(p) || norm(c.tipo_pedra).includes(p),
    ),
  );
  return { carros_chefe: partial.map(c => c.label) };
}

// ── DB: busca por critérios (linguagem natural) ──────────────────────────────

interface SizeFilt { min?: number; max?: number; eq?: number }

function extractSizeFilter(lower: string): SizeFilt {
  const n = (s: string) => parseFloat(s.replace(',', '.'));
  const result: SizeFilt = {};

  const mRange = lower.match(/(?:entre|de)\s+(\d+(?:[,.]\d+)?)\s*cms?\s+(?:e|a)\s+(\d+(?:[,.]\d+)?)\s*cms?/i);
  if (mRange) return { min: n(mRange[1]), max: n(mRange[2]) };

  const mMinBefore = lower.match(/(?:maior|acima|mais\s+de|pelo\s+menos|m[ií]nimo|no\s+m[ií]nimo)\s*(?:de|que|do\s+que)?\s*(\d+(?:[,.]\d+)?)\s*cms?/i);
  if (mMinBefore) result.min = n(mMinBefore[1]);

  const mMinAfter = lower.match(/(\d+(?:[,.]\d+)?)\s*cms?\s+(?:ou\s+mais|ou\s+acima|para\s+cima|pra\s+cima|acima)/i);
  if (mMinAfter && result.min === undefined) result.min = n(mMinAfter[1]);

  const mMaxBefore = lower.match(/(?:menor|abaixo|menos\s+de|at[eé]|m[aá]ximo|no\s+m[aá]ximo)\s*(?:de|que|do\s+que)?\s*(\d+(?:[,.]\d+)?)\s*cms?/i);
  if (mMaxBefore) result.max = n(mMaxBefore[1]);

  const mMaxAfter = lower.match(/(\d+(?:[,.]\d+)?)\s*cms?\s+(?:ou\s+menos|ou\s+abaixo|para\s+baixo|pra\s+baixo|abaixo)/i);
  if (mMaxAfter && result.max === undefined) result.max = n(mMaxAfter[1]);

  if (result.min !== undefined || result.max !== undefined) return result;

  const mEq = lower.match(/\b(\d+(?:[,.]\d+)?)\s*cms?\b/i);
  if (mEq) return { eq: n(mEq[1]) };

  return {};
}

const KW_STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'em', 'por', 'com', 'sem', 'sob', 'sobre', 'apos', 'ate', 'ante', 'entre',
  'contra', 'desde', 'durante', 'perante', 'tras',
  'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'aos',
  'pelo', 'pela', 'pelos', 'pelas', 'para', 'pra', 'pro', 'pros', 'pras',
  'que', 'quem', 'qual', 'quais', 'quanto', 'quanta', 'quantos', 'quantas',
  'onde', 'aonde', 'como', 'quando', 'porque', 'pq', 'porq',
  'e', 'ou', 'mas', 'nem', 'se', 'pois', 'porem', 'contudo', 'todavia',
  'nao', 'sim', 'tambem', 'tb', 'tbm',
  'mais', 'menos', 'muito', 'muita', 'muitos', 'muitas', 'pouco', 'pouca',
  'tanto', 'tanta', 'bem', 'mal', 'so', 'apenas', 'somente', 'ainda', 'ja',
  'algum', 'alguma', 'alguns', 'algumas', 'todo', 'toda', 'todos', 'todas', 'tudo',
  'existem', 'existe', 'tenho', 'temos', 'disponivel', 'disponiveis',
  'produto', 'produtos', 'item', 'itens', 'modelo', 'modelos', 'tipo', 'tipos',
  'peca', 'pecas', 'joia', 'joias', 'comodato', 'estoque', 'vendido', 'vendida',
  'tamanho', 'tamanhos', 'medida', 'medidas',
  'mostre', 'mostra', 'liste', 'lista', 'busca', 'busque', 'procure', 'procura',
  'quero', 'queria', 'gostaria',
]);

async function buscarPorCriterios(
  descricao: string,
  opts: { limit?: number; somenteComodato?: boolean; somenteVendido?: boolean; somenteEstoque?: boolean } = {},
) {
  const { limit = 30, somenteComodato = false, somenteVendido = false, somenteEstoque = false } = opts;
  const lower = descricao.toLowerCase();
  const sizeFilter = extractSizeFilter(lower);

  const lowerForKw = lower
    .replace(/(?:entre|de)\s+\d+(?:[,.]\d+)?\s*cms?\s+(?:e|a)\s+\d+(?:[,.]\d+)?\s*cms?/gi, ' ')
    .replace(/(?:maior|menor|acima|abaixo|mais\s+de|menos\s+de|at[eé]|pelo\s+menos|m[ií]nimo|m[aá]ximo|no\s+m[ií]nimo|no\s+m[aá]ximo)\s*(?:de|que|do\s+que)?\s*\d+(?:[,.]\d+)?\s*cms?/gi, ' ')
    .replace(/\d+(?:[,.]\d+)?\s*cms?\s+(?:ou\s+(?:mais|menos|acima|abaixo)|para\s+(?:cima|baixo)|pra\s+(?:cima|baixo)|acima|abaixo)/gi, ' ')
    .replace(/\d+(?:[,.]\d+)?\s*cms?\b/gi, ' ')
    .replace(/\btamanho\b/gi, ' ');

  const keywords = lowerForKw
    .replace(/[^a-záàâãéèêíìîóòôõúùûç\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !KW_STOPWORDS.has(normDiacritics(w)));

  if (keywords.length === 0) {
    return { erro: 'Nenhuma palavra-chave de produto identificada na descrição.' };
  }

  const querAntigo = /antigo|antiga|mais velho|primeiro/.test(lower);
  const querCaro = /mais caro|maior pre[çc]o|mais valor/.test(lower);
  const querBarato = /mais barato|menor pre[çc]o/.test(lower);

  const tr = (col: string) => `translate(LOWER(${col}), 'áàâãéèêíìîóòôõúùûçñ', 'aaaaeeeiiioooouuucn')`;

  const kwConditions = keywords.map((_, i) => `(
    ${tr('pd.descricao_jewel')} LIKE $${i + 1}
    OR ${tr('p.produto')} LIKE $${i + 1}
    OR ${tr('s.subtipo')} LIKE $${i + 1}
    OR ${tr('tp.tipo_pedra')} LIKE $${i + 1}
  )`).join(' AND ');
  const kwParams = keywords.map(k => `%${normDiacritics(k)}%`);

  const sizeNumExpr = `CASE WHEN pd.tamanho ~ '^[0-9]+([,.][0-9]+)? *[Cc][Mm]$' THEN CAST(REPLACE(REPLACE(REPLACE(UPPER(TRIM(pd.tamanho)), ' ', ''), ',', '.'), 'CM', '') AS NUMERIC) END`;
  let sizeClause = '';
  const sizeParams: number[] = [];
  if (sizeFilter.eq !== undefined) {
    sizeClause = ` AND ${sizeNumExpr} = $${kwParams.length + 1}`;
    sizeParams.push(sizeFilter.eq);
  } else {
    if (sizeFilter.min !== undefined) {
      sizeClause += ` AND ${sizeNumExpr} >= $${kwParams.length + sizeParams.length + 1}`;
      sizeParams.push(sizeFilter.min);
    }
    if (sizeFilter.max !== undefined) {
      sizeClause += ` AND ${sizeNumExpr} <= $${kwParams.length + sizeParams.length + 1}`;
      sizeParams.push(sizeFilter.max);
    }
  }

  const orderBy = querCaro ? 'pd.preco_cobrado DESC NULLS LAST'
    : querBarato ? 'pd.preco_cobrado ASC NULLS LAST'
    : querAntigo ? 'pd.data_entrada ASC NULLS LAST'
    : 'pd.data_entrada DESC NULLS LAST';

  const statusFilter = somenteVendido ? `pd."statusProdutoId" IN (2,4,13)`
    : somenteComodato ? `pd."statusProdutoId" = 6`
    : somenteEstoque ? `pd."statusProdutoId" = 3`
    : `pd."statusProdutoId" IN (3, 6)`;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
         pd.referencia, pd.tipo, pd.custo_real, pd.preco_cobrado,
         pd.preco_parceiro, pd.preco_avista, pd.preco_parcelado,
         pd.tamanho, pd.descricao_jewel, pd."statusProdutoId" AS status_id,
         pd.data_entrada,
         p.produto, s.subtipo, tp.tipo_pedra, d.destino,
         f."valorTotal" AS valor_total_financeiro,
         COUNT(*) OVER () AS total_count,
         (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id LIMIT 1) AS tem_foto
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       LEFT JOIN financeiro f  ON f.id  = pd."financeiroId"
       WHERE ${statusFilter} AND ${kwConditions}${sizeClause}
       ORDER BY
         CASE WHEN (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id LIMIT 1) IS NOT NULL THEN 0 ELSE 1 END,
         ${orderBy}
       LIMIT ${Math.min(limit, 50)}`,
      [...kwParams, ...sizeParams],
    );

    const rows = result.rows as Array<{
      referencia: string; tipo: string; custo_real: number | null;
      preco_cobrado: number | null; preco_parceiro: number | null;
      preco_avista: number | null; preco_parcelado: number | null;
      tamanho: string | null;
      descricao_jewel: string | null; status_id: number | null;
      data_entrada: string | null; produto: string | null;
      subtipo: string | null; destino: string | null;
      valor_total_financeiro: number | null;
      total_count: string | null;
    }>;

    const total = rows.length > 0 ? parseInt(rows[0].total_count ?? '0', 10) : 0;

    return {
      total_encontrado: total,
      itens_retornados: rows.length,
      pecas: rows.map(r => {
        const vendida = r.status_id != null && STATUS_VENDIDA.includes(r.status_id);
        const valorVenda = r.valor_total_financeiro ?? r.preco_cobrado;
        return {
          referencia: r.referencia,
          tipo: r.tipo,
          produto: r.produto,
          subtipo: r.subtipo,
          tamanho: r.tamanho,
          descricao: r.descricao_jewel,
          data_entrada: r.data_entrada,
          vendida,
          destino: r.destino,
          custo: fmt(r.custo_real),
          // valor efetivamente pago (tabela financeiro), com fallback pro preço da ficha quando não houver acordo financeiro
          preco_cobrado: fmt(valorVenda),
          preco_parceiro: vendida ? null : fmt(r.preco_parceiro),
          preco_avista: vendida ? null : fmt(r.preco_avista),
          preco_parcelado: vendida ? null : fmt(r.preco_parcelado),
        };
      }),
    };
  } finally {
    client.release();
  }
}

// ── DB: busca por destino ─────────────────────────────────────────────────────

async function buscarPorDestino(
  destinoTerm: string,
  opts: { somenteComodato?: boolean; somenteVendido?: boolean; keywords?: string[] } = {},
) {
  const { somenteComodato = false, somenteVendido = false, keywords = [] } = opts;

  const client = await pool.connect();
  try {
    const destRes = await client.query<{ destino: string }>(
      `SELECT DISTINCT d.destino FROM destinos d WHERE LOWER(d.destino) LIKE $1 ORDER BY d.destino LIMIT 5`,
      [`%${normDiacritics(destinoTerm)}%`],
    );

    if (destRes.rows.length === 0) {
      return { destino_encontrado: false as const };
    }

    const destinos = destRes.rows.map(r => r.destino);
    const destino = destinos.sort((a, b) => a.length - b.length)[0];

    const statusFilter = somenteVendido ? `pd."statusProdutoId" IN (2, 4, 13)`
      : somenteComodato ? `pd."statusProdutoId" = 6`
      : `pd."statusProdutoId" IN (3, 6)`;

    const tr = (col: string) => `translate(LOWER(${col}), 'áàâãéèêíìîóòôõúùûçñ', 'aaaaeeeiiioooouuucn')`;

    let kwClause = '';
    let params: string[] = [destino];
    if (keywords.length > 0) {
      const kwConds = keywords.map((_, i) => `(
        ${tr('pd.descricao_jewel')} LIKE $${i + 2}
        OR ${tr('p.produto')} LIKE $${i + 2}
        OR ${tr('s.subtipo')} LIKE $${i + 2}
        OR ${tr('tp.tipo_pedra')} LIKE $${i + 2}
      )`).join(' AND ');
      kwClause = ` AND ${kwConds}`;
      params = [destino, ...keywords.map(k => `%${normDiacritics(stemKw(k))}%`)];
    }

    const result = await client.query(
      `SELECT
         pd.referencia, pd.tipo, pd.custo_real, pd.preco_cobrado,
         pd.preco_parceiro, pd.preco_avista, pd.preco_parcelado,
         pd.descricao_jewel, pd."statusProdutoId" AS status_id,
         p.produto, s.subtipo, tp.tipo_pedra,
         f."valorTotal" AS valor_total_financeiro
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       LEFT JOIN financeiro f  ON f.id  = pd."financeiroId"
       WHERE ${statusFilter} AND LOWER(d.destino) = LOWER($1)${kwClause}
       ORDER BY pd.referencia
       LIMIT 50`,
      params,
    );

    const rows = result.rows as Array<{
      referencia: string; tipo: string; custo_real: number | null;
      preco_cobrado: number | null; preco_parceiro: number | null;
      preco_avista: number | null; preco_parcelado: number | null;
      descricao_jewel: string | null; status_id: number | null;
      produto: string | null; subtipo: string | null; tipo_pedra: string | null;
      valor_total_financeiro: number | null;
    }>;

    return {
      destino_encontrado: true as const,
      destino: capitalize(destino),
      outros_destinos_similares: destinos.slice(1).map(capitalize),
      total: rows.length,
      pecas: rows.map(r => {
        const vendida = r.status_id != null && STATUS_VENDIDA.includes(r.status_id);
        const valorVenda = r.valor_total_financeiro ?? r.preco_cobrado;
        return {
          referencia: r.referencia,
          tipo: r.tipo,
          produto: r.produto,
          subtipo: r.subtipo,
          tipo_pedra: r.tipo_pedra,
          descricao: r.descricao_jewel,
          vendida,
          custo: fmt(r.custo_real),
          // valor efetivamente pago (tabela financeiro), com fallback pro preço da ficha quando não houver acordo financeiro
          preco_cobrado: fmt(valorVenda),
          preco_parceiro: vendida ? null : fmt(r.preco_parceiro),
          preco_avista: vendida ? null : fmt(r.preco_avista),
        };
      }),
    };
  } finally {
    client.release();
  }
}

// ── DB: checar quais referências têm foto no sistema ─────────────────────────

async function checarFotos(refs: string[]) {
  const normalizedRefs = [...new Set(refs.map(r => r.trim().toUpperCase()).filter(Boolean))].slice(0, 200);
  if (normalizedRefs.length === 0) return { erro: 'Nenhuma referência informada.' };

  const client = await pool.connect();
  try {
    const result = await client.query<{ referencia: string; tem_foto: boolean }>(
      `SELECT pd.referencia,
              EXISTS (SELECT 1 FROM leilao_image li WHERE li."productDetailsId" = pd.id AND li.key IS NOT NULL) AS tem_foto
       FROM product_details pd
       WHERE UPPER(pd.referencia) = ANY($1)`,
      [normalizedRefs],
    );

    const encontradas = new Map(result.rows.map(r => [r.referencia.toUpperCase(), r.tem_foto]));
    const naoEncontradas = normalizedRefs.filter(r => !encontradas.has(r));
    const comFoto = normalizedRefs.filter(r => encontradas.get(r) === true);
    const semFoto = normalizedRefs.filter(r => encontradas.get(r) === false);

    return {
      total_consultado: normalizedRefs.length,
      com_foto: comFoto,
      sem_foto: semFoto,
      referencias_nao_encontradas_no_sistema: naoEncontradas,
    };
  } finally {
    client.release();
  }
}

// ── DB: melhor destino para enviar uma peça (histórico de vendas do mesmo tipo) ──

async function melhorDestinoParaPeca(ref: string) {
  const client = await pool.connect();
  try {
    const pecaRes = await client.query(
      `SELECT pd.id, pd.referencia, pd."produtoId", pd."subtipoId", pd."tipoPedraId",
              pd."statusProdutoId" AS status_id, pd.descricao_jewel,
              p.produto, s.subtipo, tp.tipo_pedra, d.destino AS destino_atual
       FROM product_details pd
       LEFT JOIN produto    p  ON p.id  = pd."produtoId"
       LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
       LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
       LEFT JOIN destinos   d  ON d.id  = pd."destinoId"
       WHERE UPPER(pd.referencia) = $1
       LIMIT 1`,
      [ref.toUpperCase()],
    );
    const peca = pecaRes.rows[0];
    if (!peca) return { encontrado: false as const };
    if (!peca.produtoId) {
      return { encontrado: true as const, referencia: peca.referencia, erro: 'Peça sem produto cadastrado — não é possível comparar histórico por tipo.' };
    }

    // Nível de comparação: produto (ex: "PULSEIRA RIVIERA") é o modelo em si — subtipo (FACA, ILUSION, CORAÇÃO...)
    // é só o formato do elo/acabamento dentro do mesmo modelo, então NÃO trava por subtipo (perderia amostra à toa).
    // Histórico de vendas do mesmo produto, por destino de venda.
    const historicoRes = await client.query<{ destino: string; vendas: string }>(
      `SELECT d.destino, COUNT(*) AS vendas
       FROM product_details pd
       LEFT JOIN destinos d ON d.id = pd."destinoId"
       WHERE pd."statusProdutoId" IN (2, 4, 13)
         AND d.destino IS NOT NULL
         AND pd."produtoId" = $1
       GROUP BY d.destino
       ORDER BY vendas DESC`,
      [peca.produtoId],
    );

    // Destinos que JÁ têm, agora, uma peça do mesmo produto em comodato (não faz sentido reenviar pra eles).
    const jaTemRes = await client.query<{ destino: string }>(
      `SELECT DISTINCT d.destino
       FROM product_details pd
       LEFT JOIN destinos d ON d.id = pd."destinoId"
       WHERE pd."statusProdutoId" = 6
         AND d.destino IS NOT NULL
         AND pd."produtoId" = $1`,
      [peca.produtoId],
    );
    const jaTem = new Set(jaTemRes.rows.map(r => r.destino));

    const ranking = historicoRes.rows.map(r => ({
      destino: capitalize(r.destino),
      vendas: parseInt(r.vendas, 10),
      ja_tem_peca_do_tipo_em_comodato: jaTem.has(r.destino),
    }));

    const recomendados = ranking.filter(r => !r.ja_tem_peca_do_tipo_em_comodato);

    return {
      encontrado: true as const,
      referencia: peca.referencia,
      tipo_peca: { produto: peca.produto, subtipo: peca.subtipo, tipo_pedra: peca.tipo_pedra, descricao: peca.descricao_jewel },
      nota: `Ranking calculado pelo modelo "${peca.produto}" (subtipo/tipo de pedra são só variação de acabamento dentro do mesmo modelo, não entram no filtro).`,
      status_atual: STATUS_VENDIDA.includes(peca.status_id) ? 'vendida' : peca.status_id === 6 ? `em comodato com ${capitalize(peca.destino_atual ?? '')}` : 'em estoque',
      ranking_completo_por_vendas: ranking,
      recomendados_excluindo_quem_ja_tem_em_comodato: recomendados,
    };
  } finally {
    client.release();
  }
}

// ── DB: destinos sem determinado produto ─────────────────────────────────────

const GENERIC_DEST_TERMS = new Set([
  'parceiro', 'parceiros', 'brecho', 'brechos', 'brechó', 'brechós',
  'destino', 'destinos', 'loja', 'lojas', 'parceria', 'parcerias',
  'todos', 'todas', 'todos os destinos', 'todas as lojas',
]);

const PARCEIROS_OFICIAIS = [
  'ACHADOS PERDIDOS', 'ALINE RAMOS', 'ALINI DUARTE', 'ANDRÉ FAUSTINO',
  'BRILHO VINTAGE', 'CIRCULAR JOIAS', 'CLAUDIA MASCARENHAS', 'DANIELLE VOGUE',
  'DESAPEGO DO LUXO', 'ELIANE DANTAS', 'ETERNNO', 'ETIQUETA ÚNICA',
  'ETSY BRECHO', 'GRINGA', 'IVAIR ONGARATTO', 'JOÃO FECHY JOIAS',
  'JÓIAS EM DESAPEGO', 'LAURA BATEZINI', 'LOHANA COELHO', 'LOUCA POR JÓIAS',
  'MEGA DO LUXO', 'NIUMA', 'REAL DEAL', 'RESOLVI DESAPEGAR',
  'SECOND HAND', 'SIDNEI QUARTIER', 'TATI CANTO', 'TRIZZ JOIAS', 'UMA VEZ MAIS',
];

async function buscarDestinosSemProduto(destFilter: string, productKeywords: string[]) {
  const norm = normDiacritics;
  const tr = (col: string) => `translate(LOWER(${col}), 'áàâãéèêíìîóòôõúùûçñ', 'aaaaeeeiiioooouuucn')`;
  const isGeneric = GENERIC_DEST_TERMS.has(norm(destFilter.trim()));

  const client = await pool.connect();
  try {
    const destRes = await client.query<{ id: number; destino: string }>(
      isGeneric
        ? `SELECT d.id, d.destino FROM destinos d WHERE UPPER(d.destino) = ANY($1::text[]) ORDER BY d.destino`
        : `SELECT d.id, d.destino FROM destinos d WHERE ${tr('d.destino')} LIKE $1 ORDER BY d.destino`,
      isGeneric ? [PARCEIROS_OFICIAIS] : [`%${norm(destFilter)}%`],
    );

    if (destRes.rows.length === 0) {
      return { erro: `Nenhum destino encontrado com o nome "${destFilter}".` };
    }

    const kwConditions = productKeywords.map((_, i) => `(
      ${tr('pd.descricao_jewel')} LIKE $${i + 2}
      OR ${tr('p.produto')} LIKE $${i + 2}
      OR ${tr('s.subtipo')} LIKE $${i + 2}
      OR ${tr('tp.tipo_pedra')} LIKE $${i + 2}
    )`).join(' AND ');
    const kwParams = productKeywords.map(k => `%${norm(k)}%`);

    const missing: string[] = [];
    const present: string[] = [];

    for (const row of destRes.rows) {
      const check = await client.query<{ has_it: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM product_details pd
          LEFT JOIN produto    p  ON p.id  = pd."produtoId"
          LEFT JOIN subtipo    s  ON s.id  = pd."subtipoId"
          LEFT JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId"
          WHERE pd."destinoId" = $1
            AND pd."statusProdutoId" = ${isGeneric ? 6 : 'ANY(ARRAY[3,6])'}
            AND ${kwConditions}
        ) AS has_it`,
        [row.id, ...kwParams],
      );
      (check.rows[0].has_it ? present : missing).push(row.destino);
    }

    return {
      total_verificado: destRes.rows.length,
      produto_buscado: productKeywords.join(' '),
      com_produto: present.map(capitalize),
      sem_produto: missing.map(capitalize),
    };
  } finally {
    client.release();
  }
}

// ── DB: exploração livre do schema (banco espelho, read-only) ───────────────

const SQL_FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|grant|revoke|create|call|copy|merge|vacuum|reindex|comment|listen|notify|do|execute)\b/i;

async function listarTabelas() {
  const client = await pool.connect();
  try {
    const res = await client.query<{ table_name: string; col_count: string }>(
      `SELECT table_name, count(*) AS col_count
       FROM information_schema.columns
       WHERE table_schema = 'public'
       GROUP BY table_name
       ORDER BY table_name`,
    );
    return { tabelas: res.rows.map(r => ({ nome: r.table_name, colunas: parseInt(r.col_count, 10) })) };
  } finally {
    client.release();
  }
}

async function descreverTabela(tabela: string) {
  const client = await pool.connect();
  try {
    const res = await client.query<{ column_name: string; data_type: string; is_nullable: string }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [tabela],
    );
    if (res.rows.length === 0) return { erro: `Tabela "${tabela}" não encontrada.` };
    return {
      tabela,
      colunas: res.rows.map(r => ({ nome: r.column_name, tipo: r.data_type, permite_nulo: r.is_nullable === 'YES' })),
    };
  } finally {
    client.release();
  }
}

async function executarSql(query: string) {
  const trimmed = query.trim().replace(/;+\s*$/, '');
  if (!/^select\b/i.test(trimmed)) {
    return { erro: 'Apenas consultas SELECT são permitidas.' };
  }
  if (SQL_FORBIDDEN.test(trimmed)) {
    return { erro: 'Query contém palavra-chave não permitida. Apenas leitura (SELECT) é permitida neste banco.' };
  }
  const client = await pool.connect();
  try {
    await client.query('SET statement_timeout = 8000');
    const limited = /\blimit\s+\d+/i.test(trimmed) ? trimmed : `${trimmed} LIMIT 100`;
    const res = await client.query(limited);
    return { linhas: res.rows, total_retornado: res.rows.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { erro: `Erro na query: ${msg}` };
  } finally {
    client.release();
  }
}

// ── Ferramentas expostas ao Claude ───────────────────────────────────────────

const tools = [
  betaZodTool({
    name: 'consultar_referencia',
    description: 'Busca os dados completos de uma peça específica pela referência (ex: E11111, G22222). Use quando o usuário mencionar um código de referência.',
    inputSchema: z.object({
      referencia: z.string().describe('Código da referência, ex: E11111'),
    }),
    run: async ({ referencia }) => JSON.stringify(await queryRef(referencia)),
  }),
  betaZodTool({
    name: 'buscar_pecas_por_criterios',
    description: 'Busca peças disponíveis (estoque ou comodato) usando uma descrição em linguagem natural do tipo de peça (ex: "colar riviera diamante", "anel solitário 2cm"). Suporta filtro de tamanho em cm dentro da descrição. Use para perguntas gerais de catálogo, sem referência específica e sem destino/parceiro mencionado. NÃO cobre filtro por código interno de categoria/fabricação (coluna "tipo": JF, JRCP, JRSP, JMCP, etc) — para isso use executar_sql.',
    inputSchema: z.object({
      descricao: z.string().describe('Descrição da peça buscada, em linguagem natural, incluindo eventuais filtros de tamanho (ex: "colar riviera diamante acima de 40cm")'),
      limite: z.number().int().min(1).max(50).optional().describe('Quantidade máxima de peças a retornar (padrão 30)'),
      somente_comodato: z.boolean().optional().describe('true se o usuário quer apenas peças em comodato'),
      somente_vendido: z.boolean().optional().describe('true se o usuário quer apenas peças já vendidas'),
      somente_estoque: z.boolean().optional().describe('true SOMENTE se o usuário disser explicitamente "em estoque" ou "estoque interno" — NÃO usar para "disponível" (que inclui comodato também)'),
    }),
    run: async ({ descricao, limite, somente_comodato, somente_vendido, somente_estoque }) =>
      JSON.stringify(await buscarPorCriterios(descricao, {
        limit: limite,
        somenteComodato: somente_comodato,
        somenteVendido: somente_vendido,
        somenteEstoque: somente_estoque,
      })),
  }),
  betaZodTool({
    name: 'buscar_pecas_por_destino',
    description: 'Busca peças associadas a um destino/parceiro específico (loja, brechó, parceiro de comodato), opcionalmente filtrando por tipo de peça. Use quando o usuário citar o nome de um parceiro/destino/loja.',
    inputSchema: z.object({
      destino: z.string().describe('Nome do destino/parceiro, ex: "achados perdidos", "brilho vintage"'),
      somente_comodato: z.boolean().optional(),
      somente_vendido: z.boolean().optional(),
      palavras_chave_produto: z.array(z.string()).optional().describe('Palavras-chave do tipo de peça, se o usuário especificou (ex: ["colar", "riviera"])'),
    }),
    run: async ({ destino, somente_comodato, somente_vendido, palavras_chave_produto }) =>
      JSON.stringify(await buscarPorDestino(destino, {
        somenteComodato: somente_comodato,
        somenteVendido: somente_vendido,
        keywords: palavras_chave_produto,
      })),
  }),
  betaZodTool({
    name: 'checar_fotos',
    description: 'Verifica, para uma lista de referências, quais têm foto cadastrada no sistema e quais não têm. Use SEMPRE que o usuário perguntar "quais dessas referências não têm foto?", "essas peças têm foto?" ou similar — nunca tente responder isso via executar_sql, esta ferramenta já faz a checagem exata e evita erro na lista.',
    inputSchema: z.object({
      referencias: z.array(z.string()).describe('Lista de códigos de referência a checar, ex: ["E11111", "E12222"]'),
    }),
    run: async ({ referencias }) => JSON.stringify(await checarFotos(referencias)),
  }),
  betaZodTool({
    name: 'melhor_destino_para_peca',
    description: 'Dado o código de uma referência, identifica o tipo da peça (produto/subtipo/tipo de pedra) e retorna o ranking de destinos/parceiros por número de vendas históricas desse mesmo tipo de peça, já excluindo quem atualmente tem uma peça do mesmo tipo em comodato. Use para perguntas como "pra quem envio a E14387?", "quem tem mais chance de vender essa peça?", "quem é melhor pra mandar essa referência".',
    inputSchema: z.object({
      referencia: z.string().describe('Código da referência, ex: E14387'),
    }),
    run: async ({ referencia }) => JSON.stringify(await melhorDestinoParaPeca(referencia)),
  }),
  betaZodTool({
    name: 'listar_carros_chefe',
    description: 'Lista todos os carros chefe (peças de referência/destaque) cadastrados no sistema.',
    inputSchema: z.object({}),
    run: async () => JSON.stringify(await listarCarrosChefe()),
  }),
  betaZodTool({
    name: 'buscar_carro_chefe_por_termo',
    description: 'Busca carros chefe que correspondem a um termo/tipo de peça (ex: "riviera", "solitário diamante"). Use quando o usuário perguntar sobre um carro chefe específico sem mencionar destino.',
    inputSchema: z.object({
      termo: z.string().describe('Termo de busca, ex: "riviera" ou "solitário diamante"'),
    }),
    run: async ({ termo }) => JSON.stringify(buscarCarrosChefePorTermo(termo)),
  }),
  betaZodTool({
    name: 'verificar_cobertura_carros_chefe_destino',
    description: 'Verifica quais carros chefe estão faltando ou cobertos em um destino/parceiro específico. Use quando o usuário perguntar se um destino "tem todos os carros chefe" ou "está faltando algum carro chefe".',
    inputSchema: z.object({
      destino: z.string().describe('Nome do destino/parceiro'),
    }),
    run: async ({ destino }) => JSON.stringify(await checkCarrosChefeDestino(destino)),
  }),
  betaZodTool({
    name: 'buscar_destinos_sem_produto',
    description: 'Verifica quais destinos/parceiros NÃO possuem um determinado tipo de peça disponível. Use para perguntas como "quais parceiros não têm colar riviera?".',
    inputSchema: z.object({
      destino_filtro: z.string().describe('Filtro de destino: nome específico, ou termo genérico como "parceiros"/"todos os destinos" para verificar todos os parceiros oficiais'),
      palavras_chave_produto: z.array(z.string()).describe('Palavras-chave do tipo de peça buscada, ex: ["colar", "riviera"]'),
    }),
    run: async ({ destino_filtro, palavras_chave_produto }) =>
      JSON.stringify(await buscarDestinosSemProduto(destino_filtro, palavras_chave_produto)),
  }),
  betaZodTool({
    name: 'listar_tabelas_banco',
    description: 'Lista todas as tabelas do banco espelho (PostgreSQL) com a contagem de colunas de cada uma. Use quando a pergunta do usuário não se encaixa em nenhuma das outras ferramentas e você precisa explorar o banco para descobrir onde a informação está.',
    inputSchema: z.object({}),
    run: async () => JSON.stringify(await listarTabelas()),
  }),
  betaZodTool({
    name: 'descrever_tabela',
    description: 'Retorna as colunas (nome, tipo, se aceita nulo) de uma tabela específica do banco espelho. Use depois de listar_tabelas_banco para entender a estrutura antes de montar uma query com executar_sql.',
    inputSchema: z.object({
      tabela: z.string().describe('Nome exato da tabela, ex: "product_details", "cliente"'),
    }),
    run: async ({ tabela }) => JSON.stringify(await descreverTabela(tabela)),
  }),
  betaZodTool({
    name: 'executar_sql',
    description: 'Executa uma query SQL de leitura (SELECT) no banco espelho PostgreSQL para responder perguntas abertas que as outras ferramentas não cobrem — ex: "quem tem mais chance de vender X", estatísticas, cruzamentos entre tabelas, informações sobre clientes, vendas, avaliações etc. Colunas em camelCase precisam de aspas duplas (ex: pd."statusProdutoId"). Apenas SELECT é permitido; resultado limitado a 100 linhas por padrão. Use descrever_tabela antes se não tiver certeza da estrutura.',
    inputSchema: z.object({
      query: z.string().describe('Query SQL SELECT completa'),
    }),
    run: async ({ query }) => JSON.stringify(await executarSql(query)),
  }),
];

const SYSTEM_PROMPT = `Você é o Nexus, o assistente de consulta rápida da Goldtech Joias — um canivete suíço para qualquer pergunta sobre o que está no sistema: referências, preços, disponibilidade, quem tem o quê, quais destinos/parceiros têm mais chance de vender determinada peça, carros chefe, e qualquer outra informação armazenada no banco. Responda em português, de forma direta e natural, como um vendedor experiente falando com um colega.

Vocabulário do domínio — use exatamente estas definições, nunca infira sozinho:
- "Disponível" = estoque (SEM VENDA EFETIVADA) + comodato (EM COMODATO), os dois juntos. NÃO chame nenhuma tool com somente_estoque=true a menos que o usuário diga explicitamente "em estoque" ou "só no estoque interno" — "disponível" por si só nunca significa somente_estoque.
- "Em comodato" ou o nome de um parceiro = somente EM COMODATO.
- "Vendido"/"vendida" = os 3 status de venda (VENDIDO E PAGO, AGUARDANDO PAGAMENTO, VENDIDO PARCELADO).

Estrutura de product_details — use estas colunas relacionais, NUNCA busque um tipo de joia ou modelo dentro de descricao_inteligente/caracteristica (são textos de marketing gerados, não estruturados, e frequentemente não contêm o termo exato):
- Tipo de joia (BRINCO, ANEL, COLAR, PULSEIRA, PINGENTE, ALIANÇA...) = tabela "produto" via produtoId. Em executar_sql: JOIN produto p ON p.id = pd."produtoId" WHERE UPPER(p.produto) LIKE '%BRINCO%'.
- Modelo/subtipo (ILUSION, MARACANÃ, SOLITÁRIO, RIVIERA, CRAVEJADO...) = tabela "subtipo" via subtipoId. JOIN subtipo s ON s.id = pd."subtipoId" WHERE UPPER(s.subtipo) = 'ILUSION'.
- Tipo de pedra (DIAMANTE, ESMERALDA, TURMALINA PARAÍBA...) = tabela "tipo_pedra" via tipoPedraId. JOIN tipo_pedra tp ON tp.id = pd."tipoPedraId".
- Se uma busca por produto/subtipo/tipo_pedra não achar nada, SÓ ENTÃO tente descricao_jewel ou descricao_inteligente como fallback — nunca comece por elas.
- Se mesmo assim não achar nada, use listar_tabelas_banco/descrever_tabela para checar se os nomes exatos usados nessas tabelas (ex: "ILUSION" vs "ILLUSION") batem com o termo buscado antes de dizer que não existe.
- Certificado/certificada (o usuário usa as duas formas, tratam do mesmo conceito): a coluna pd.certificada (texto livre) indica se a peça é certificada. Filtro correto: UPPER(pd.certificada) LIKE '%CERTIF%' OR UPPER(pd.certificada) = 'SIM' — NUNCA compare com igualdade exata a um único valor, porque o campo tem várias grafias (SIM, CERTIFICADA, CERTIFICADO, CERTIFICADO Nº14012/23, CERTIFICADA - 14130/23, etc). pd.numero_certificado / pd.certificado guardam o número/detalhe do certificado quando existe.
- Faixa/range de quilates (ex: "1,3 a 1,4 ct", "entre 2 e 3 quilates") NÃO é coberto pela ferramenta buscar_pecas_por_criterios (ela só faz busca por texto, não filtro numérico) — use SEMPRE executar_sql para isso. A coluna pd.cts_diamantes é texto (ex: "1.32"), então filtre com: pd.cts_diamantes ~ '^[0-9]+([.,][0-9]+)?$' AND CAST(REPLACE(pd.cts_diamantes, ',', '.') AS NUMERIC) BETWEEN 1.3 AND 1.4 — isso já traz só peças dentro do range pedido; NUNCA retorne peças fora da faixa como "as mais próximas" quando o usuário pediu um range específico, isso é um erro grave. Pedra colorida usa pd.cts_pedra_colorida da mesma forma.
- Regra geral para qualquer coluna de texto livre no banco (não só certificada): nunca assuma um único valor exato. Antes de concluir "não encontrei", rode um SELECT DISTINCT dessa coluna (via executar_sql) pra ver as variações reais de valor, e use LIKE/ILIKE cobrindo essas variações.
- Preço de uma peça VENDIDA (qualquer cálculo de média/total/soma de vendas) = SEMPRE o valor real pago, que fica na tabela "financeiro" (JOIN financeiro f ON f.id = pd."financeiroId"), coluna f."valorTotal" — é esse valor que aparece na aba Financeiro do sistema e é a fonte de verdade. pd.preco_cobrado é só o preço calculado/planejado na ficha do produto, pode divergir do que foi realmente cobrado — use-o SOMENTE como fallback (COALESCE(f."valorTotal", pd.preco_cobrado)) quando a peça não tiver financeiroId ou o financeiro não tiver valorTotal. NUNCA use preco_avista, preco_parcelado, preco_parceiro ou preco_combinado para "preço de venda" — são preços de tabela/proposta, só relevantes para peças ainda à venda (estoque/comodato).

Como agir:
- Para perguntas comuns (referência específica, busca de peça por descrição, peças de um destino/parceiro, carros chefe), use as ferramentas específicas — elas já têm a lógica de busca certa.
- Pergunta do tipo "pra quem eu envio a [referência]?", "quem tem mais chance de vender essa peça?", "quem é melhor pra mandar a [referência]?" = use SEMPRE a ferramenta melhor_destino_para_peca. Ela já cruza o histórico de vendas do mesmo tipo de peça por destino E exclui quem já tem uma peça do mesmo tipo em comodato (não faz sentido recomendar enviar pra quem já está com uma igual). Ao responder, use a lista "recomendados_excluindo_quem_ja_tem_em_comodato" para a recomendação, mas se algum destino do topo do ranking foi excluído por já ter a peça, mencione isso ("Loja X vende bem esse tipo, mas já tem uma em comodato, por isso não recomendo reenviar pra ela").
- Se uma ferramenta específica não encontrar nada ou não cobrir o que foi pedido (ex: filtro por código de tipo/categoria interno, estatísticas, cruzamentos, "quem tem mais chance de vender X", informações sobre clientes/vendas/avaliações), não desista: use listar_tabelas_banco e descrever_tabela para entender a estrutura, depois executar_sql para responder. Explore o banco antes de dizer que não sabe buscar algo.
- Se o usuário te corrigir ou te der uma informação sobre como o banco funciona (ex: "JF é o tipo de compra, é a coluna tipo em product_details, tem JF, JC, JRCP, JRSP"), isso é prioridade máxima: refaça a busca imediatamente usando essa informação, com executar_sql se necessário. Nunca repita a mesma dúvida ou a mesma busca que já falhou — a correção do usuário sempre resolve o impasse, use-a.
- Se o usuário disser que um dado factual que você trouxe está errado (ex: "essa referência tem foto sim", "esse preço tá errado"), NUNCA apenas concorde ou diga "você tem razão" sem antes rodar a ferramenta/query de novo para confirmar de fato. Refaça a consulta, veja o resultado real, e só então responda — se o resultado confirmar o usuário, ótimo; se não confirmar, diga isso educadamente e explique o que a consulta mostra. Concordar sem reconsultar é um erro grave (finge verificação que não aconteceu).
- Ao usar executar_sql em product_details, NUNCA assuma de cabeça o significado de um "statusProdutoId" — sempre faça JOIN com a tabela status_produto (ON status_produto.id = pd."statusProdutoId") e leia o nome do status. Não adivinhe: 2, 4 e 13 são "vendido" (VENDIDO E PAGO, AGUARDANDO PAGAMENTO, VENDIDO PARCELADO), 6 é "em comodato", 3 é "sem venda efetivada" (estoque), mas confirme sempre pelo JOIN antes de interpretar um número.
- Nunca invente referências, preços, disponibilidade ou qualquer dado — sempre confirme com uma ferramenta antes de responder.
- Não escreva texto explicando o que você vai fazer a seguir ("deixa eu verificar...", "vou calcular...") antes de já ter o resultado final — só escreva texto de resposta quando já tiver os dados para responder de fato.

Regras de formatação:
- Sempre que citar uma referência de peça, envolva em negrito markdown: **E11111**.
- Preços já formatados (ex: "R$ 1.500") vindos das ferramentas estruturadas: use como estão. Valores numéricos brutos vindos de executar_sql: formate em Real antes de mostrar.
- Peça DISPONÍVEL (estoque ou comodato): sempre mostre os 3 preços — parceiro, à vista e parcelado — nunca só um deles.
- Peça VENDIDA: mostre só o valor pelo qual foi vendida (nunca parceiro/à vista/parcelado, que não se aplicam mais).
- Ao listar cada peça, use SEMPRE 3 linhas separadas dentro do mesmo parágrafo (referência + descrição na primeira linha, depois quebra de linha para as outras duas):
  1. Referência em negrito + o campo "tipo" entre parênteses (JF, JC, JRCP, JRSP, JMCP, JMSP, etc — nunca omita) + descrição da peça.
  2. Linha de status: se estiver em estoque interno, comece com "📦 Em estoque"; se estiver em comodato, comece com "🤝 Em comodato com [Parceiro]"; se vendida, comece com "✅ Vendida para [destino/cliente]".
  3. Linha de preços: se disponível, "💰 Parceiro: R$ X | À vista: R$ Y | Parcelado: R$ Z"; se vendida, "💰 Vendida por R$ X".
  Nunca junte a linha de status e a linha de preço na mesma linha — são sempre linhas separadas.
- Ao listar várias peças, use um parágrafo por peça (as 3 linhas acima), sem numerar.
- NUNCA mostre menos peças do que "itens_retornados" indica — se a ferramenta retornou 23 itens, liste as 23 (ou pelo menos deixe claro que são 23 e pergunte se quer ver todas antes de resumir). Omitir peças da resposta sem avisar é um erro grave.
- Ao responder perguntas de estatística/agregação (média, total, contagem, faixa de preço via executar_sql), sempre inclua junto com o número as peças que compõem o cálculo — não só referência e preço "cru". Para cada peça, traga também a descrição (pd.descricao_jewel, ou pd.descricao_inteligente se a primeira for nula) e quem tem/vendeu (para vendida: destino de venda ou o cliente; para disponível: o destino/parceiro em comodato, ou "estoque"). Ou seja, ao montar a query de estatística já inclua essas colunas no SELECT/JOIN (produto, destinos, cliente se houver) em vez de rodar uma segunda query separada. Uma resposta que é só "referência — preço" sem descrição nem quem tem a peça está incompleta.
- Se a busca não encontrar nada, diga isso claramente e sugira reformular a pergunta.
- Seja conciso: não repita a pergunta do usuário, não adicione avisos ou disclaimers.`;

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!process.env.PG_CONNECTION_STRING) {
    return NextResponse.json({ reply: 'Banco de dados não configurado.' }, { status: 500 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ reply: 'Serviço de IA não configurado.' }, { status: 500 });
  }

  type HistoryMsg = { role: 'user' | 'assistant'; text: string };
  const body = await req.json() as { message?: string; history?: HistoryMsg[] };
  const message = (body.message ?? '').trim();
  if (!message) {
    return NextResponse.json({ reply: 'Mensagem vazia.' }, { status: 400 });
  }

  const history = body.history ?? [];

  try {
    const finalMessage = await anthropic.beta.messages.toolRunner({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      max_iterations: 15,
      // System prompt fixo entre todas as chamadas — cache reduz ~90% do custo dessa parte
      // a partir da segunda mensagem dentro da janela de 5min (compartilhado entre usuários).
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools,
      // Só as últimas 10 trocas — histórico completo cresce o custo linearmente numa conversa longa.
      messages: [
        ...history.slice(-20).map(h => ({ role: h.role, content: h.text })),
        { role: 'user' as const, content: message },
      ],
    });

    const textBlock = finalMessage.content.find(
      (b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text',
    );
    // stop_reason "tool_use" significa que o loop foi truncado (limite de iterações) com uma
    // tool call pendente — o texto presente é só um preâmbulo, não a resposta final.
    const reply = finalMessage.stop_reason === 'tool_use'
      ? 'A consulta ficou complexa demais e não terminei a tempo. Pode tentar reformular de forma mais específica?'
      : textBlock?.text ?? 'Não consegui gerar uma resposta.';

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ reply: `Erro ao consultar: ${msg}` }, { status: 500 });
  }
}
