import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const PERMS = ['kanban', 'minhas'];

// Usado para rejeitar um pedido de exclusão (não requer admin — quem
// solicitou ou qualquer colaborador pode desistir).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pool = getAppPool();
  await pool.query('DELETE FROM task_delete_requests WHERE id = $1', [id]);
  return NextResponse.json({ httpStatus: 200 });
}
