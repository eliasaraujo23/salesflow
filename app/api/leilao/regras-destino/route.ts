import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const addSchema = z.object({ destino: z.string().min(1) });

const regraOutputSchema = z.object({
  id: z.string(),
  destino: z.string(),
  ativo: z.boolean(),
});

type RegraOutput = z.infer<typeof regraOutputSchema>;

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query('SELECT id, destino, ativo FROM leilao_regras_destino ORDER BY destino ASC');
  const data: RegraOutput[] = result.rows.map((r) => ({ id: r.id, destino: r.destino, ativo: r.ativo }));
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const pool = getAppPool();
  const result = await pool.query(
    'INSERT INTO leilao_regras_destino (destino, ativo) VALUES ($1, true) RETURNING id, destino, ativo',
    [parsed.data.destino]
  );
  const row = result.rows[0];
  const data: RegraOutput = { id: row.id, destino: row.destino, ativo: row.ativo };
  return NextResponse.json({ httpStatus: 200, data }, { status: 201 });
}
