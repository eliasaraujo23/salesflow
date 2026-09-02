import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pool = getAppPool();
  await pool.query('DELETE FROM analise_ht_uploads WHERE id = $1', [id]);
  return NextResponse.json({ httpStatus: 200 });
}
