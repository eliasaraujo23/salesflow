import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const patchSchema = z.object({ loja: z.string().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.' }, { status: 400 });
  }

  const pool = getAppPool();
  await pool.query(
    `UPDATE analise_ht_loja_base SET loja = $1, updated_at = now() WHERE id = $2`,
    [parsed.data.loja, id]
  );

  return NextResponse.json({ httpStatus: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pool = getAppPool();
  await pool.query(`DELETE FROM analise_ht_loja_base WHERE id = $1`, [id]);

  return NextResponse.json({ httpStatus: 200 });
}
