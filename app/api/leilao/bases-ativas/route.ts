import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const addSchema = z.object({
  codigoPlatforma: z.string().nullable(),
  filename: z.string().min(1),
  count: z.number().int().min(0),
  refs: z.array(z.string()),
  refsVendidos: z.array(z.string()).default([]),
  pricePerRef: z.record(z.string(), z.number()).default({}),
});

const rowOutputSchema = z.object({
  id: z.string(),
  codigo_plataforma: z.string().nullable(),
  filename: z.string(),
  count_pecas: z.number(),
  refs: z.array(z.string()),
  refs_vendidos: z.array(z.string()),
  excluded: z.boolean(),
  price_per_ref: z.record(z.string(), z.number()),
});

type RowOutput = z.infer<typeof rowOutputSchema>;

function mapRow(row: any): RowOutput {
  return {
    id: row.id,
    codigo_plataforma: row.codigo_plataforma,
    filename: row.filename,
    count_pecas: row.count_pecas,
    refs: row.refs ?? [],
    refs_vendidos: row.refs_vendidos ?? [],
    excluded: row.excluded,
    price_per_ref: row.price_per_ref ?? {},
  };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, codigo_plataforma, filename, count_pecas, refs, refs_vendidos, excluded, price_per_ref
     FROM leilao_bases_ativas ORDER BY created_at ASC`
  );
  const data: RowOutput[] = result.rows.map(mapRow);
  return NextResponse.json({ httpStatus: 200, data });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { codigoPlatforma, filename, count, refs, refsVendidos, pricePerRef } = parsed.data;
  const pool = getAppPool();
  const result = await pool.query(
    `INSERT INTO leilao_bases_ativas (codigo_plataforma, filename, count_pecas, refs, refs_vendidos, price_per_ref)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, codigo_plataforma, filename, count_pecas, refs, refs_vendidos, excluded, price_per_ref`,
    [codigoPlatforma, filename, count, refs, refsVendidos, JSON.stringify(pricePerRef)]
  );
  const data: RowOutput = mapRow(result.rows[0]);
  return NextResponse.json({ httpStatus: 200, data }, { status: 201 });
}
