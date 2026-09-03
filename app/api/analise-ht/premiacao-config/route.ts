import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const faixaSchema = z.object({
  id: z.string(),
  grupoLojas: z.string(),
  valorMin: z.number(),
  valorMax: z.number(),
  pesoMin: z.number(),
  pesoMax: z.number().nullable(),
  premio1: z.number().min(0),
  premio2: z.number().min(0),
  premio3: z.number().min(0),
});

function mapRow(row: any) {
  return {
    id: row.id,
    grupoLojas: row.grupoLojas,
    valorMin: Number(row.valorMin),
    valorMax: Number(row.valorMax),
    pesoMin: Number(row.pesoMin),
    pesoMax: row.pesoMax === null ? null : Number(row.pesoMax),
    premio1: Number(row.premio1),
    premio2: Number(row.premio2),
    premio3: Number(row.premio3),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const grupoLojas = searchParams.get('grupoLojas');

  const pool = getAppPool();
  const result = grupoLojas
    ? await pool.query(
        `SELECT id, grupo_lojas AS "grupoLojas", valor_min AS "valorMin", valor_max AS "valorMax",
                peso_min AS "pesoMin", peso_max AS "pesoMax", premio_1 AS "premio1", premio_2 AS "premio2", premio_3 AS "premio3"
         FROM analise_ht_premiacao_config WHERE grupo_lojas = $1
         ORDER BY valor_min DESC, peso_min ASC`,
        [grupoLojas]
      )
    : await pool.query(
        `SELECT id, grupo_lojas AS "grupoLojas", valor_min AS "valorMin", valor_max AS "valorMax",
                peso_min AS "pesoMin", peso_max AS "pesoMax", premio_1 AS "premio1", premio_2 AS "premio2", premio_3 AS "premio3"
         FROM analise_ht_premiacao_config
         ORDER BY grupo_lojas, valor_min DESC, peso_min ASC`
      );

  return NextResponse.json({ httpStatus: 200, data: result.rows.map(mapRow) });
}

const updateSchema = z.object({ faixas: z.array(faixaSchema) });

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
    for (const f of parsed.data.faixas) {
      await client.query(
        `UPDATE analise_ht_premiacao_config
         SET premio_1 = $1, premio_2 = $2, premio_3 = $3, updated_at = now()
         WHERE id = $4`,
        [f.premio1, f.premio2, f.premio3, f.id]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json({ httpStatus: 500, message: 'Erro ao salvar configuração.' }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ httpStatus: 200 });
}
