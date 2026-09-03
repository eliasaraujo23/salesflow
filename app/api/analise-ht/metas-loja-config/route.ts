import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

function mapRow(row: any) {
  return {
    id: row.id,
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

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, loja, meta_peso, premio_peso, meta_pago_grama, premio_pago_grama,
            meta_conversao, premio_conversao, limite_abaixo_250, meta_abaixo_250, premio_abaixo_250
     FROM analise_ht_metas_loja ORDER BY loja`
  );

  return NextResponse.json({ httpStatus: 200, data: result.rows.map(mapRow) });
}

const metaSchema = z.object({
  id: z.string(),
  metaPeso: z.number().min(0),
  premioPeso: z.number().min(0),
  metaPagoGrama: z.number().min(0),
  premioPagoGrama: z.number().min(0),
  metaConversao: z.number().min(0).max(1),
  premioConversao: z.number().min(0),
  limiteAbaixo250: z.number().min(0),
  metaAbaixo250: z.number().min(0).max(1),
  premioAbaixo250: z.number().min(0),
});

const updateSchema = z.object({ metas: z.array(metaSchema) });

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const pool = getAppPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const m of parsed.data.metas) {
      await client.query(
        `UPDATE analise_ht_metas_loja
         SET meta_peso = $1, premio_peso = $2, meta_pago_grama = $3, premio_pago_grama = $4,
             meta_conversao = $5, premio_conversao = $6, limite_abaixo_250 = $7,
             meta_abaixo_250 = $8, premio_abaixo_250 = $9, updated_at = now()
         WHERE id = $10`,
        [m.metaPeso, m.premioPeso, m.metaPagoGrama, m.premioPagoGrama, m.metaConversao,
         m.premioConversao, m.limiteAbaixo250, m.metaAbaixo250, m.premioAbaixo250, m.id]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json({ httpStatus: 500, message: 'Erro ao salvar metas.' }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ httpStatus: 200 });
}
