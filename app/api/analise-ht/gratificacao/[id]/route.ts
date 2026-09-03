import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pool = getAppPool();
  await pool.query(`DELETE FROM analise_ht_gratificacao WHERE id = $1`, [id]);

  return NextResponse.json({ httpStatus: 200 });
}
