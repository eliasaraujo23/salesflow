import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const approveSchema = z.object({
  docId: z.string().min(1),
  taskId: z.string(),
});

// Admin-only: antes essa checagem de role era feita no client, lendo
// Firestore usuarios/{email} direto do navegador — inseguro (nada impedia
// forjar isso) e desatualizado (role real já vem do JWT/Neon).
export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { docId, taskId } = parsed.data;
  const pool = getAppPool();

  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    await pool.query('DELETE FROM task_delete_requests WHERE id = $1', [docId]);
    return NextResponse.json({ httpStatus: 200, message: 'Tarefa excluída.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao aprovar exclusão';
    return NextResponse.json({ httpStatus: 500, message: msg }, { status: 500 });
  }
}
