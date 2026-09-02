import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const PERMS = ['kanban', 'minhas'];

const createSchema = z.object({
  taskId: z.string(),
  title: z.string(),
  requestedBy: z.string(),
  requestedByName: z.string(),
});

const requestOutputSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  title: z.string().nullable(),
  requestedBy: z.string().nullable(),
  requestedByName: z.string().nullable(),
  createdAt: z.string(),
});

type RequestOutput = z.infer<typeof requestOutputSchema>;

function mapRow(row: any): RequestOutput {
  return {
    id: row.id,
    taskId: row.task_id,
    title: row.title,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name,
    createdAt: row.created_at.toISOString ? row.created_at.toISOString() : row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, task_id, title, requested_by, requested_by_name, created_at
     FROM task_delete_requests ORDER BY created_at DESC`
  );
  const data: RequestOutput[] = result.rows.map(mapRow);
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { taskId, title, requestedBy, requestedByName } = parsed.data;
  const pool = getAppPool();
  await pool.query(
    `INSERT INTO task_delete_requests (task_id, title, requested_by, requested_by_name)
     VALUES ($1,$2,$3,$4)`,
    [taskId, title, requestedBy, requestedByName]
  );
  return NextResponse.json({ httpStatus: 200 });
}
