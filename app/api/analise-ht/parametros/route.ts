import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, requireAnaliseHtFinanceiro } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

function mapRow(row: any) {
  return {
    teorMedio: Number(row.teor_medio),
    valorFino: Number(row.valor_fino),
    percentual: Number(row.percentual),
    limitePagoPorGrama: Number(row.limite_pago_por_grama),
    limiteValorGrama: Number(row.limite_valor_grama),
    pesoMinimo: Number(row.peso_minimo),
    valorBonusPrimeiroPreco: Number(row.valor_bonus_primeiro_preco),
    limiteMediaBonusPrimeiroPreco: Number(row.limite_media_bonus_primeiro_preco),
    teorMedioLucro: Number(row.teor_medio_lucro),
    valorFinoLucro: Number(row.valor_fino_lucro),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT teor_medio, valor_fino, percentual, limite_pago_por_grama, limite_valor_grama,
            peso_minimo, valor_bonus_primeiro_preco, limite_media_bonus_primeiro_preco,
            teor_medio_lucro, valor_fino_lucro
     FROM analise_ht_parametros WHERE id = 1`
  );

  return NextResponse.json({ httpStatus: 200, data: result.rows[0] ? mapRow(result.rows[0]) : null });
}

const paramsSchema = z.object({
  teorMedio: z.number().min(0),
  valorFino: z.number().min(0),
  percentual: z.number().min(0),
  limitePagoPorGrama: z.number().min(0),
  limiteValorGrama: z.number().min(0),
  pesoMinimo: z.number().min(0),
  valorBonusPrimeiroPreco: z.number().min(0),
  limiteMediaBonusPrimeiroPreco: z.number().min(0),
  teorMedioLucro: z.number().min(0),
  valorFinoLucro: z.number().min(0),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAnaliseHtFinanceiro(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = paramsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Parâmetros inválidos.', errors: parsed.error }, { status: 400 });
  }

  const p = parsed.data;
  const pool = getAppPool();
  await pool.query(
    `UPDATE analise_ht_parametros
     SET teor_medio = $1, valor_fino = $2, percentual = $3, limite_pago_por_grama = $4,
         limite_valor_grama = $5, peso_minimo = $6, valor_bonus_primeiro_preco = $7,
         limite_media_bonus_primeiro_preco = $8, teor_medio_lucro = $9, valor_fino_lucro = $10,
         updated_at = now()
     WHERE id = 1`,
    [p.teorMedio, p.valorFino, p.percentual, p.limitePagoPorGrama, p.limiteValorGrama,
     p.pesoMinimo, p.valorBonusPrimeiroPreco, p.limiteMediaBonusPrimeiroPreco,
     p.teorMedioLucro, p.valorFinoLucro]
  );

  return NextResponse.json({ httpStatus: 200 });
}
