import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { requireLojaAccess } from '@/lib/auth/require-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const pool = getControleLojasPool();
  const result = await pool.query(`SELECT * FROM despesa WHERE loja = $1 ORDER BY data DESC`, [loja]);
  return NextResponse.json({ data: result.rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = randomUUID();

  const pool = getControleLojasPool();
  const result = await pool.query(
    `INSERT INTO despesa (id, loja, data, tipo_despesa_id, forma_pagamento_id, banco_caixa_id, valor, observacao)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, loja, body.data, body.tipo_despesa_id ?? null, body.forma_pagamento_id ?? null,
     body.banco_caixa_id ?? null, body.valor ?? 0, body.observacao ?? '']
  );

  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
