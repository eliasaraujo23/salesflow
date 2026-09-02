import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { requireLojaAccess } from '@/lib/auth/require-auth';

const COLUMN_MAP: Record<string, string> = {
  data: 'data', tipo_lancamento_id: 'tipo_lancamento_id', banco_caixa_id: 'banco_caixa_id',
  descricao: 'descricao', valor: 'valor',
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ loja: string; id: string }> }) {
  const { loja, id } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const body = await req.json();

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const key of Object.keys(body)) {
    if (!(key in COLUMN_MAP)) continue;
    sets.push(`${COLUMN_MAP[key]} = $${i}`);
    values.push(body[key]);
    i++;
  }
  if (sets.length === 0) return NextResponse.json({ message: 'Nada para atualizar' }, { status: 400 });
  values.push(loja, id);

  const pool = getControleLojasPool();
  const result = await pool.query(
    `UPDATE lancamento SET ${sets.join(', ')} WHERE loja = $${i} AND id = $${i + 1} RETURNING *`,
    values
  );

  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ loja: string; id: string }> }) {
  const { loja, id } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const pool = getControleLojasPool();
  await pool.query(`DELETE FROM lancamento WHERE loja = $1 AND id = $2`, [loja, id]);
  return NextResponse.json({ data: { id } });
}
