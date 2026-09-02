import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';
import { getControleLojasPool } from '@/lib/controle-lojas-db';

// Sincroniza com a tabela global de avaliadoras (Controle de Lojas) —
// qualquer avaliadora ATIVA que ainda não tem loja base cadastrada entra
// automaticamente em "Sem loja", pronta para ser arrastada no board.
async function sincronizarComAvaliadoresAtivos() {
  const appPool = getAppPool();
  const controlePool = getControleLojasPool();

  const [{ rows: ativas }, { rows: existentes }] = await Promise.all([
    controlePool.query(`SELECT nome FROM avaliadores WHERE ativo = true`),
    appPool.query(`SELECT avaliador FROM analise_ht_loja_base`),
  ]);

  const jaExistem = new Set(existentes.map(r => r.avaliador));
  const faltando = ativas.map(r => r.nome).filter(nome => !jaExistem.has(nome));
  if (faltando.length === 0) return;

  const values = faltando.map((_, i) => `($${i + 1}, 'Sem loja')`).join(',');
  await appPool.query(
    `INSERT INTO analise_ht_loja_base (avaliador, loja) VALUES ${values}
     ON CONFLICT (avaliador) DO NOTHING`,
    faltando
  );
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  await sincronizarComAvaliadoresAtivos().catch(() => {});

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, avaliador, loja FROM analise_ht_loja_base ORDER BY avaliador`
  );

  return NextResponse.json({ httpStatus: 200, data: result.rows });
}

const addSchema = z.object({
  avaliador: z.string().min(1),
  loja: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const pool = getAppPool();
  const result = await pool.query(
    `INSERT INTO analise_ht_loja_base (avaliador, loja) VALUES ($1, $2)
     ON CONFLICT (avaliador) DO UPDATE SET loja = EXCLUDED.loja, updated_at = now()
     RETURNING id, avaliador, loja`,
    [parsed.data.avaliador, parsed.data.loja]
  );

  return NextResponse.json({ httpStatus: 200, data: result.rows[0] }, { status: 201 });
}
