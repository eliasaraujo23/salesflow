import { NextRequest, NextResponse } from 'next/server';
import { getControleLojasPool } from '@/lib/controle-lojas-db';
import { slugify } from '@/lib/slugify';
import { requireAnyLojaAccess } from '@/lib/auth/require-auth';

const ALLOWED_TABLES = new Set([
  'avaliadores',
  'bancos_caixa',
  'motivos_nc',
  'modalidades',
  'empresas',
  'tipos_despesa',
  'formas_pagamento',
  'tipos_lancamento',
]);

function assertTable(table: string): string {
  if (!ALLOWED_TABLES.has(table)) throw new Error('Tabela inválida');
  return table;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  try {
    assertTable(table);
  } catch {
    return NextResponse.json({ message: 'Tabela inválida' }, { status: 400 });
  }
  const access = await requireAnyLojaAccess(req);
  if (!access.ok) return access.response;

  const pool = getControleLojasPool();
  const result = table === 'empresas'
    ? await pool.query(`SELECT id, nome, modalidade_id FROM empresas ORDER BY nome ASC`)
    : table === 'avaliadores'
    ? await pool.query(`SELECT id, nome, ativo FROM avaliadores ORDER BY nome ASC`)
    : table === 'motivos_nc'
    ? await pool.query(`SELECT id, nome FROM motivos_nc ORDER BY ordem ASC`)
    : await pool.query(`SELECT id, nome FROM ${table} ORDER BY nome ASC`);

  return NextResponse.json({ data: result.rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  try {
    assertTable(table);
  } catch {
    return NextResponse.json({ message: 'Tabela inválida' }, { status: 400 });
  }
  const access = await requireAnyLojaAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json();
  const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
  if (!nome) return NextResponse.json({ message: 'Nome obrigatório' }, { status: 400 });

  const pool = getControleLojasPool();

  if (table === 'motivos_nc') {
    // ids numéricos sequenciais (herdados da tb_ncompra do Access), não slug.
    const maxOrdem = await pool.query(`SELECT COALESCE(MAX(ordem), 0) AS max FROM motivos_nc`);
    const proximaOrdem = Number(maxOrdem.rows[0].max) + 1;
    const id = String(proximaOrdem);
    try {
      await pool.query(`INSERT INTO motivos_nc (id, nome, ordem) VALUES ($1, $2, $3)`, [id, nome, proximaOrdem]);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
        return NextResponse.json({ message: 'Item já existe' }, { status: 409 });
      }
      throw err;
    }
    return NextResponse.json({ data: { id, nome } }, { status: 201 });
  }

  const id = slugify(nome);
  if (!id) return NextResponse.json({ message: 'Nome inválido' }, { status: 400 });

  try {
    await pool.query(`INSERT INTO ${table} (id, nome) VALUES ($1, $2)`, [id, nome]);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      return NextResponse.json({ message: 'Item já existe' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({
    data: table === 'avaliadores' ? { id, nome, ativo: true } : { id, nome },
  }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  try {
    assertTable(table);
  } catch {
    return NextResponse.json({ message: 'Tabela inválida' }, { status: 400 });
  }
  const access = await requireAnyLojaAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json();
  const id = typeof body?.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ message: 'id obrigatório' }, { status: 400 });

  const pool = getControleLojasPool();

  if (table === 'avaliadores' && typeof body?.ativo === 'boolean' && typeof body?.nome === 'undefined') {
    const result = await pool.query(
      `UPDATE avaliadores SET ativo = $1 WHERE id = $2 RETURNING id, nome, ativo`,
      [body.ativo, id]
    );
    return NextResponse.json({ data: result.rows[0] });
  }

  const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
  if (!nome) return NextResponse.json({ message: 'nome obrigatório' }, { status: 400 });

  if (table === 'empresas' && typeof body?.modalidade_id !== 'undefined') {
    const modalidadeId = body.modalidade_id || null;
    await pool.query(`UPDATE empresas SET nome = $1, modalidade_id = $2 WHERE id = $3`, [nome, modalidadeId, id]);
    return NextResponse.json({ data: { id, nome, modalidade_id: modalidadeId } });
  }

  if (table === 'avaliadores') {
    const result = await pool.query(
      `UPDATE avaliadores SET nome = $1 WHERE id = $2 RETURNING id, nome, ativo`,
      [nome, id]
    );
    return NextResponse.json({ data: result.rows[0] });
  }

  await pool.query(`UPDATE ${table} SET nome = $1 WHERE id = $2`, [nome, id]);
  return NextResponse.json({ data: { id, nome } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  const { table } = await params;
  try {
    assertTable(table);
  } catch {
    return NextResponse.json({ message: 'Tabela inválida' }, { status: 400 });
  }
  const access = await requireAnyLojaAccess(req);
  if (!access.ok) return access.response;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id obrigatório' }, { status: 400 });

  const pool = getControleLojasPool();
  await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return NextResponse.json({ data: { id } });
}
