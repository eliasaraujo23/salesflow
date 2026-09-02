import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const leilaoStatusSchema = z.enum(['captando', 'convite', 'convite_catalogo', 'venda_pos_leilao', 'finalizado']);

const patchSchema = z.object({
  numero: z.string().min(1).optional(),
  nome: z.string().min(1).optional(),
  dataInicio: z.string().min(1).optional(),
  dataFim: z.string().min(1).optional(),
  cor: z.string().min(1).optional(),
  codigoPlatforma: z.string().optional(),
  observacao: z.string().optional(),
  status: leilaoStatusSchema.optional(),
});

const COLUMN_MAP: Record<string, string> = {
  numero: 'numero',
  nome: 'nome',
  dataInicio: 'data_inicio',
  dataFim: 'data_fim',
  cor: 'cor',
  codigoPlatforma: 'codigo_plataforma',
  observacao: 'observacao',
  status: 'status',
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    setClauses.push(`${COLUMN_MAP[key]} = $${i}`);
    values.push(value);
    i++;
  }
  if (setClauses.length === 0) {
    return NextResponse.json({ httpStatus: 400, message: 'Nada para atualizar.' }, { status: 400 });
  }

  values.push(id);
  const pool = getAppPool();
  await pool.query(`UPDATE leilao_leiloes SET ${setClauses.join(', ')} WHERE id = $${i}`, values);
  return NextResponse.json({ httpStatus: 200 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const pool = getAppPool();
  await pool.query('DELETE FROM leilao_leiloes WHERE id = $1', [id]);
  return NextResponse.json({ httpStatus: 200 });
}
