import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';
import { calcularBonusPrimeiroPreco, DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS } from '@/lib/analise-ht/bonus-primeiro-preco';
import type { AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

const paramsSchema = z.object({
  uploadIds: z.array(z.string().min(1)).min(1),
  valorBonus: z.number().min(0).default(DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS.valorBonus),
  limiteMedia: z.number().min(0).default(DEFAULT_BONUS_PRIMEIRO_PRECO_PARAMS.limiteMedia),
});

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = paramsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Parâmetros inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { uploadIds, valorBonus, limiteMedia } = parsed.data;
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
    const porAvaliador = calcularBonusPrimeiroPreco(registros, { valorBonus, limiteMedia });
    resultado.push(...porAvaliador.map(r => ({ ...r, loja, uploadId })));
  }

  return NextResponse.json({ httpStatus: 200, data: resultado });
}
