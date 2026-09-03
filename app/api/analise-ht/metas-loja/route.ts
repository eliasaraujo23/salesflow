import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';
import { calcularMetaLoja, type MetaLojaConfig } from '@/lib/analise-ht/metas-loja';
import type { AnaliseHtRegistroDb } from '@/lib/analise-ht/bonificacao';

const paramsSchema = z.object({
  uploadIds: z.array(z.string().min(1)).min(1),
});

function mapConfigRow(row: any): MetaLojaConfig {
  return {
    loja: row.loja,
    metaPeso: Number(row.meta_peso),
    premioPeso: Number(row.premio_peso),
    metaPagoGrama: Number(row.meta_pago_grama),
    premioPagoGrama: Number(row.premio_pago_grama),
    metaConversao: Number(row.meta_conversao),
    premioConversao: Number(row.premio_conversao),
    limiteAbaixo250: Number(row.limite_abaixo_250),
    metaAbaixo250: Number(row.meta_abaixo_250),
    premioAbaixo250: Number(row.premio_abaixo_250),
  };
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = paramsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Parâmetros inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { uploadIds } = parsed.data;
  const pool = getAppPool();

  const [metasResult, ...uploadsResults] = await Promise.all([
    pool.query(`SELECT * FROM analise_ht_metas_loja`),
    ...uploadIds.map(uploadId =>
      Promise.all([
        pool.query(
          `SELECT cod_interno, transacao, motivo_nc, preco, peso_total, valor_gasto, pago_por_grama,
                  ouro_24k, ouro_22k, pt, ouro_750, ouro_720, bx, platina, prata, avaliador
           FROM analise_ht_registros WHERE upload_id = $1`,
          [uploadId]
        ),
        pool.query(`SELECT loja FROM analise_ht_uploads WHERE id = $1`, [uploadId]),
      ])
    ),
  ]);

  const metasPorLoja = new Map(metasResult.rows.map(r => [r.loja, mapConfigRow(r)]));

  const resultado = uploadsResults.map(([registrosResult, uploadResult]) => {
    const loja = uploadResult.rows[0]?.loja ?? '';
    const config = metasPorLoja.get(loja);
    if (!config) return null;
    const registros = registrosResult.rows as AnaliseHtRegistroDb[];
    return calcularMetaLoja(registros, config);
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json({ httpStatus: 200, data: resultado });
}
