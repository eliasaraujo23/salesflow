import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';
import { calcularResumo, DEFAULT_RESUMO_PARAMS } from '@/lib/analise-ht/resumo';
import type { AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

const paramsSchema = z.object({
  uploadIds: z.array(z.string().min(1)).min(1),
  teorMedio: z.number().min(0).max(1).default(DEFAULT_RESUMO_PARAMS.teorMedio),
  valorFino: z.number().min(0).default(DEFAULT_RESUMO_PARAMS.valorFino),
  limitePagoPorGrama: z.number().min(0).default(DEFAULT_RESUMO_PARAMS.limitePagoPorGrama),
});

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = paramsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Parâmetros inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { uploadIds, ...params } = parsed.data;
  const pool = getAppPool();

  const resultado = [];
  for (const uploadId of uploadIds) {
    const [registrosResult, uploadResult] = await Promise.all([
      pool.query(
        `SELECT cod_interno, transacao, motivo_nc, preco, peso_total, valor_gasto, pago_por_grama,
                ouro_24k, ouro_22k, pt, ouro_750, ouro_720, bx, platina, prata, avaliador
         FROM analise_ht_registros WHERE upload_id = $1`,
        [uploadId]
      ),
      pool.query(`SELECT loja FROM analise_ht_uploads WHERE id = $1`, [uploadId]),
    ]);

    const registros = registrosResult.rows as AnaliseHtRegistroDb[];
    const loja = uploadResult.rows[0]?.loja ?? '';
    const porAvaliadora = calcularResumo(registros, params);
    resultado.push(...porAvaliadora.map(r => ({ ...r, loja, uploadId })));
  }

  return NextResponse.json({ httpStatus: 200, data: resultado });
}
