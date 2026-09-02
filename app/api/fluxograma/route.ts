import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const saveSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

const outputSchema = z.object({
  nodes: z.array(z.any()),
  edges: z.array(z.any()),
});

type FluxogramaOutput = z.infer<typeof outputSchema>;

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'fluxograma');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(`SELECT nodes, edges FROM fluxogramas WHERE id = 'empresa'`);
  const row = result.rows[0];
  const data: FluxogramaOutput = { nodes: row?.nodes ?? [], edges: row?.edges ?? [] };
  return NextResponse.json({ httpStatus: 200, data });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, 'fluxograma');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const pool = getAppPool();
  await pool.query(
    `INSERT INTO fluxogramas (id, nodes, edges) VALUES ('empresa', $1, $2)
     ON CONFLICT (id) DO UPDATE SET nodes = EXCLUDED.nodes, edges = EXCLUDED.edges, updated_at = now()`,
    [JSON.stringify(parsed.data.nodes), JSON.stringify(parsed.data.edges)]
  );

  return NextResponse.json({ httpStatus: 200 });
}
