import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const patchSchema = z.object({
  label: z.string().min(1).optional(),
  produto: z.string().optional(),
  subtipo: z.string().optional(),
  tipo_pedra: z.string().optional(),
  lapidacao: z.string().optional(),
  order: z.number().optional(),
});

const PERMS = ['fabricacoes', 'parceiros'];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const fields = parsed.data;
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const column = key === 'order' ? '"order"' : key;
    setClauses.push(`${column} = $${i}`);
    values.push(value);
    i++;
  }
  if (setClauses.length === 0) {
    return NextResponse.json({ httpStatus: 400, message: 'Nada para atualizar.' }, { status: 400 });
  }

  values.push(id);
  const pool = getAppPool();
  await pool.query(`UPDATE carros_chefe SET ${setClauses.join(', ')} WHERE id = $${i}`, values);
  return NextResponse.json({ httpStatus: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pool = getAppPool();
  await pool.query('DELETE FROM carros_chefe WHERE id = $1', [id]);
  return NextResponse.json({ httpStatus: 200 });
}
