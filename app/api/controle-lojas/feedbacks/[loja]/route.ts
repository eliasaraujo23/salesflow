import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { slugify } from '@/lib/slugify';
import { requireLojaAccess } from '@/lib/auth/require-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const pool = getControleLojasPool();
  const result = await pool.query(
    `SELECT id, nome FROM feedbacks_compra WHERE loja = $1 ORDER BY nome ASC`,
    [loja]
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const body = await req.json();
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
  if (!nome) return NextResponse.json({ message: 'Nome obrigatório' }, { status: 400 });

  const id = slugify(nome);
  if (!id) return NextResponse.json({ message: 'Nome inválido' }, { status: 400 });

  const pool = getControleLojasPool();
  try {
    await pool.query(
      `INSERT INTO feedbacks_compra (id, loja, nome) VALUES ($1, $2, $3)`,
      [id, loja, nome]
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ message: 'Item já existe' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ data: { id, nome } }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = typeof body?.id === 'string' ? body.id : '';
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
  if (!id || !nome) return NextResponse.json({ message: 'id e nome obrigatórios' }, { status: 400 });

  const pool = getControleLojasPool();
  await pool.query(
    `UPDATE feedbacks_compra SET nome = $1 WHERE loja = $2 AND id = $3`,
    [nome, loja, id]
  );
  return NextResponse.json({ data: { id, nome } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ loja: string }> }) {
  const { loja } = await params;
  const access = await requireLojaAccess(req, loja);
  if (!access.ok) return access.response;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id obrigatório' }, { status: 400 });

  const pool = getControleLojasPool();
  await pool.query(`DELETE FROM feedbacks_compra WHERE loja = $1 AND id = $2`, [loja, id]);
  return NextResponse.json({ data: { id } });
}
