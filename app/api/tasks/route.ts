import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const PERMS = ['kanban', 'minhas'];

const taskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  person: z.string().min(1),
  priority: z.enum(['urgente', 'alta', 'media', 'baixa']),
  status: z.enum(['pendente', 'progress', 'blocked', 'done']),
  due: z.string().optional(),
});

const taskOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  person: z.string(),
  priority: z.string(),
  status: z.string(),
  due: z.string(),
  late: z.number(),
  description: z.string().nullable(),
  createdAt: z.string(),
});

type TaskOutput = z.infer<typeof taskOutputSchema>;

function mapRow(row: any): TaskOutput {
  return {
    id: row.id,
    title: row.title,
    person: row.person,
    priority: row.priority,
    status: row.status,
    due: row.due,
    late: row.late,
    description: row.description,
    createdAt: row.created_at.toISOString ? row.created_at.toISOString() : row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, title, person, priority, status, due, late, description, created_at
     FROM tasks ORDER BY created_at DESC`
  );
  const data: TaskOutput[] = result.rows.map(mapRow);
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = taskInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { title, description, person, priority, status, due } = parsed.data;
  const pool = getAppPool();
  const result = await pool.query(
    `INSERT INTO tasks (title, person, priority, status, due, late, description)
     VALUES ($1,$2,$3,$4,$5,0,$6)
     RETURNING id, title, person, priority, status, due, late, description, created_at`,
    [title, person, priority, status, due ?? 'Sem prazo', description ?? '']
  );
  const data: TaskOutput = mapRow(result.rows[0]);
  return NextResponse.json({ httpStatus: 200, data }, { status: 201 });
}
