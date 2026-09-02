import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';
import { CC_DEFAULTS } from '@/lib/actions/carros-chefe';

const PERMS = ['fabricacoes', 'parceiros'];

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, PERMS);
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const existing = await pool.query('SELECT 1 FROM carros_chefe LIMIT 1');
  if ((existing.rowCount ?? 0) > 0) {
    return NextResponse.json({ httpStatus: 400, message: 'Só é possível carregar padrões quando a lista está vazia.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const def of CC_DEFAULTS) {
      await client.query(
        `INSERT INTO carros_chefe (label, produto, subtipo, tipo_pedra, lapidacao, "order")
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [def.label, def.produto, def.subtipo, def.tipo_pedra, def.lapidacao, def.order]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return NextResponse.json({ httpStatus: 200 });
}
