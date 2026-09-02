import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { requireLojaAccess } from '@/lib/auth/require-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const pool = getControleLojasPool();
  const registros = await pool.query(
    `SELECT id, updated_at FROM caixa_registro WHERE loja = $1 ORDER BY updated_at DESC`,
    [loja]
  );
  const ids = registros.rows.map(r => r.id);
  const itens = ids.length
    ? await pool.query(`SELECT * FROM caixa_item WHERE caixa_registro_id = ANY($1)`, [ids])
    : { rows: [] };

  const data = registros.rows.map(reg => ({
    id: reg.id,
    updatedAt: reg.updated_at,
    bruto: itens.rows.filter(i => i.caixa_registro_id === reg.id && i.grupo === 'bruto')
      .map(i => ({ local: i.local, valor: Number(i.valor) })),
    trocados: itens.rows.filter(i => i.caixa_registro_id === reg.id && i.grupo === 'trocados')
      .map(i => ({ local: i.local, valor: Number(i.valor) })),
  }));

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const body = await req.json();
  const bruto: Array<{ local: string; valor: number }> = body.bruto ?? [];
  const trocados: Array<{ local: string; valor: number }> = body.trocados ?? [];

  const pool = getControleLojasPool();
  const id = randomUUID();

  await pool.query(`INSERT INTO caixa_registro (id, loja) VALUES ($1, $2)`, [id, loja]);

  for (const [grupo, items] of [['bruto', bruto], ['trocados', trocados]] as const) {
    for (const item of items) {
      await pool.query(
        `INSERT INTO caixa_item (id, caixa_registro_id, grupo, local, valor) VALUES ($1,$2,$3,$4,$5)`,
        [randomUUID(), id, grupo, item.local, item.valor]
      );
    }
  }

  return NextResponse.json({ data: { id, bruto, trocados } }, { status: 201 });
}
