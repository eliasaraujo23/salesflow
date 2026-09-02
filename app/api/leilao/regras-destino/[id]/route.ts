import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const patchSchema = z.object({ ativo: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const pool = getAppPool();
  await pool.query('UPDATE leilao_regras_destino SET ativo = $1 WHERE id = $2', [parsed.data.ativo, id]);
  return NextResponse.json({ httpStatus: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pool = getAppPool();
  await pool.query('DELETE FROM leilao_regras_destino WHERE id = $1', [id]);
  return NextResponse.json({ httpStatus: 200 });
}
