import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const carroChefeInputSchema = z.object({
  label: z.string().min(1),
  produto: z.string().default(''),
  subtipo: z.string().default(''),
  tipo_pedra: z.string().default(''),
  lapidacao: z.string().default(''),
  order: z.number(),
});

const carroChefeOutputSchema = z.object({
  id: z.string(),
  label: z.string(),
  produto: z.string(),
  subtipo: z.string(),
  tipo_pedra: z.string(),
  lapidacao: z.string(),
  order: z.number(),
});

type CarroChefeOutput = z.infer<typeof carroChefeOutputSchema>;

const PERMS = ['fabricacoes', 'parceiros'];

function mapRow(row: any): CarroChefeOutput {
  return {
    id: row.id,
    label: row.label,
    produto: row.produto,
    subtipo: row.subtipo,
    tipo_pedra: row.tipo_pedra,
    lapidacao: row.lapidacao,
    order: row.order,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, label, produto, subtipo, tipo_pedra, lapidacao, "order" FROM carros_chefe ORDER BY "order" ASC`
  );
  const data: CarroChefeOutput[] = result.rows.map(mapRow);
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = carroChefeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { label, produto, subtipo, tipo_pedra, lapidacao, order } = parsed.data;
  const pool = getAppPool();
  const result = await pool.query(
    `INSERT INTO carros_chefe (label, produto, subtipo, tipo_pedra, lapidacao, "order")
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, label, produto, subtipo, tipo_pedra, lapidacao, "order"`,
    [label, produto, subtipo, tipo_pedra, lapidacao, order]
  );
  const data: CarroChefeOutput = mapRow(result.rows[0]);
  return NextResponse.json({ httpStatus: 200, data }, { status: 201 });
}
