import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const metalInputSchema = z.object({
  tipo: z.enum(['entrada', 'cadastro', 'antigo']),
  metal: z.enum(['ouro', 'prata', 'platina']),
  data: z.string().min(1),
  origem: z.string().min(1),
  chegou: z.number(),
  cadastrado: z.number(),
  sobrou: z.number(),
  peso: z.number(),
  obs: z.string().optional(),
});

const metalOutputSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  metal: z.string(),
  chegou: z.number(),
  cadastrado: z.number(),
  sobrou: z.number(),
  peso: z.number(),
  origem: z.string(),
  data: z.string(),
  obs: z.string().nullable(),
  createdAt: z.string(),
});

type MetalOutput = z.infer<typeof metalOutputSchema>;

function mapRow(row: any): MetalOutput {
  return {
    id: row.id,
    tipo: row.tipo,
    metal: row.metal,
    chegou: Number(row.chegou),
    cadastrado: Number(row.cadastrado),
    sobrou: Number(row.sobrou),
    peso: Number(row.peso),
    origem: row.origem,
    data: row.data,
    obs: row.obs,
    createdAt: row.created_at.toISOString ? row.created_at.toISOString() : row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'metais');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, tipo, metal, chegou, cadastrado, sobrou, peso, origem, data, obs, created_at
     FROM metais_globais ORDER BY created_at DESC`
  );
  const data: MetalOutput[] = result.rows.map(mapRow);
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'metais');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = metalInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { tipo, metal, data, origem, chegou, cadastrado, sobrou, peso, obs } = parsed.data;
  const pool = getAppPool();
  const result = await pool.query(
    `INSERT INTO metais_globais (tipo, metal, chegou, cadastrado, sobrou, peso, origem, data, obs)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, tipo, metal, chegou, cadastrado, sobrou, peso, origem, data, obs, created_at`,
    [tipo, metal, chegou, cadastrado, sobrou, peso, origem, data, obs ?? null]
  );
  const output: MetalOutput = mapRow(result.rows[0]);
  return NextResponse.json({ httpStatus: 200, data: output }, { status: 201 });
}
