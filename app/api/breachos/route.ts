import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const brechoSchema = z.object({
  nome: z.string().min(1),
  estado: z.string().min(1),
  uf: z.string().min(1),
});

const brechoOutputSchema = z.object({
  id: z.string(),
  nome: z.string(),
  estado: z.string(),
  uf: z.string(),
});

type BrechoOutput = z.infer<typeof brechoOutputSchema>;

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'revenda');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query('SELECT id, nome, estado, uf FROM breachos ORDER BY nome ASC');
  const data: BrechoOutput[] = result.rows.map((r) => ({ id: r.id, nome: r.nome, estado: r.estado, uf: r.uf }));
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'revenda');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = brechoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const pool = getAppPool();
  const result = await pool.query(
    'INSERT INTO breachos (nome, estado, uf) VALUES ($1, $2, $3) RETURNING id, nome, estado, uf',
    [parsed.data.nome, parsed.data.estado, parsed.data.uf]
  );
  const row = result.rows[0];
  const data: BrechoOutput = { id: row.id, nome: row.nome, estado: row.estado, uf: row.uf };
  return NextResponse.json({ httpStatus: 200, data }, { status: 201 });
}
