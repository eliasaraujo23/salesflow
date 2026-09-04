import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnaliseHtFinanceiro } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';
import { calcularPremiacao, DEFAULT_PREMIACAO_PARAMS, type PremiacaoFaixa } from '@/lib/analise-ht/premiacao';
import type { AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

const alvoSchema = z.object({ uploadId: z.string().min(1), grupoLojas: z.string().min(1) });

const paramsSchema = z.object({
  alvos: z.array(alvoSchema).min(1),
  limiteValorGrama: z.number().min(0).default(DEFAULT_PREMIACAO_PARAMS.limiteValorGrama),
  pesoMinimo: z.number().min(0).default(DEFAULT_PREMIACAO_PARAMS.pesoMinimo),
});

function mapFaixas(rows: any[]): PremiacaoFaixa[] {
  return rows.map(f => ({
    valorMin: Number(f.valorMin),
    valorMax: Number(f.valorMax),
    pesoMin: Number(f.pesoMin),
    pesoMax: f.pesoMax === null ? null : Number(f.pesoMax),
    premio1: Number(f.premio1),
    premio2: Number(f.premio2),
    premio3: Number(f.premio3),
  }));
}

export async function POST(req: NextRequest) {
  const auth = await requireAnaliseHtFinanceiro(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = paramsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Parâmetros inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { alvos, ...params } = parsed.data;
  const pool = getAppPool();

  const resultado = [];
  for (const { uploadId, grupoLojas } of alvos) {
    const [registrosResult, faixasResult, uploadResult] = await Promise.all([
      pool.query(
        `SELECT cod_interno, transacao, motivo_nc, preco, peso_total, valor_gasto, pago_por_grama,
                ouro_24k, ouro_22k, pt, ouro_750, ouro_720, bx, platina, prata, avaliador
         FROM analise_ht_registros WHERE upload_id = $1`,
        [uploadId]
      ),
      pool.query(
        `SELECT valor_min AS "valorMin", valor_max AS "valorMax", peso_min AS "pesoMin", peso_max AS "pesoMax",
                premio_1 AS "premio1", premio_2 AS "premio2", premio_3 AS "premio3"
         FROM analise_ht_premiacao_config WHERE grupo_lojas = $1`,
        [grupoLojas]
      ),
      pool.query(`SELECT loja FROM analise_ht_uploads WHERE id = $1`, [uploadId]),
    ]);

    const registros = registrosResult.rows as AnaliseHtRegistroDb[];
    const faixas = mapFaixas(faixasResult.rows);
    const loja = uploadResult.rows[0]?.loja ?? '';

    const { porAvaliador } = calcularPremiacao(registros, faixas, params);
    resultado.push(...porAvaliador.map(p => ({ ...p, loja, uploadId })));
  }

  return NextResponse.json({ httpStatus: 200, data: resultado });
}
