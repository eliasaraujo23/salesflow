import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { requireLojaAccess } from '@/lib/auth/require-auth';

const QUALIDADES = ['ouro_24k', 'ouro_22k', 'pt', 'ouro_750', 'ouro_720', 'bx', 'platina', 'prata'];

const COLUMN_MAP: Record<string, string> = {
  cod_interno: 'cod_interno', data: 'data', hora: 'hora', avaliadores: 'avaliadores',
  nome: 'nome', cpf: 'cpf', transacao: 'transacao',
  feedback_id: 'feedback_id', feedback_nc_id: 'feedback_nc_id',
  modalidade_id: 'modalidade_id', empresa_id: 'empresa_id',
  ouro_24k: 'ouro_24k', ouro_22k: 'ouro_22k', pt: 'pt', ouro_750: 'ouro_750', ouro_720: 'ouro_720',
  bx: 'bx', platina: 'platina', prata: 'prata',
  preco: 'preco', valor: 'valor', observacao: 'observacao',
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ loja: string; id: string }> }) {
  const { loja, id } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const body = await req.json();
  const pool = getControleLojasPool();

  const current = await pool.query(`SELECT * FROM metal WHERE loja = $1 AND id = $2`, [loja, id]);
  if (current.rows.length === 0) return NextResponse.json({ message: 'Registro não encontrado' }, { status: 404 });

  const merged = { ...current.rows[0], ...body };
  const totalPeso = QUALIDADES.reduce((sum, q) => sum + (Number(merged[q]) || 0), 0);
  const pagoPorGrama = totalPeso > 0 ? (Number(merged.valor) || 0) / totalPeso : 0;

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const key of Object.keys(body)) {
    if (!(key in COLUMN_MAP)) continue;
    sets.push(`${COLUMN_MAP[key]} = $${i}`);
    values.push(body[key]);
    i++;
  }
  sets.push(`total_peso = $${i}`); values.push(totalPeso); i++;
  sets.push(`pago_por_grama = $${i}`); values.push(pagoPorGrama); i++;
  values.push(loja, id);

  const result = await pool.query(
    `UPDATE metal SET ${sets.join(', ')} WHERE loja = $${i} AND id = $${i + 1} RETURNING *`,
    values
  );

  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ loja: string; id: string }> }) {
  const { loja, id } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const pool = getControleLojasPool();
  await pool.query(`DELETE FROM metal WHERE loja = $1 AND id = $2`, [loja, id]);
  return NextResponse.json({ data: { id } });
}
