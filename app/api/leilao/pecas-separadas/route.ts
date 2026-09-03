import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const toggleSchema = z.object({
  codigoPlatforma: z.string().min(1),
  referencia:      z.string().min(1),
  separado:        z.boolean(),
});

// Lista as referências já marcadas como separadas, opcionalmente filtrando por leilão.
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const codigoPlatforma = req.nextUrl.searchParams.get('codigoPlatforma');
  const pool = getAppPool();
  const result = codigoPlatforma
    ? await pool.query(
        `SELECT codigo_plataforma, referencia FROM leilao_pecas_separadas WHERE codigo_plataforma = $1`,
        [codigoPlatforma],
      )
    : await pool.query(`SELECT codigo_plataforma, referencia FROM leilao_pecas_separadas`);

  return NextResponse.json({
    httpStatus: 200,
    data: result.rows.map(r => ({ codigoPlatforma: r.codigo_plataforma, referencia: r.referencia })),
  });
}

// Marca/desmarca uma referência como separada fisicamente.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { codigoPlatforma, referencia, separado } = parsed.data;
  const pool = getAppPool();

  if (separado) {
    await pool.query(
      `INSERT INTO leilao_pecas_separadas (codigo_plataforma, referencia, separado_por)
       VALUES ($1, $2, $3)
       ON CONFLICT (codigo_plataforma, referencia) DO NOTHING`,
      [codigoPlatforma, referencia.toUpperCase(), auth.session.email ?? null],
    );
  } else {
    await pool.query(
      `DELETE FROM leilao_pecas_separadas WHERE codigo_plataforma = $1 AND referencia = $2`,
      [codigoPlatforma, referencia.toUpperCase()],
    );
  }

  return NextResponse.json({ httpStatus: 200 });
}
