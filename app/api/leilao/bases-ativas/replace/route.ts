import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const requestSchema = z.object({
  codigoPlatforma: z.string(),
  filename: z.string().min(1).optional(), // omitido = só remove (leilão finalizado)
  count: z.number().int().min(0).optional(),
  refs: z.array(z.string()).optional(),
  refsVendidos: z.array(z.string()).optional(),
  pricePerRef: z.record(z.string(), z.number()).optional(),
  loteParaRef: z.record(z.string(), z.string()).optional(),
});

// Substitui (remove + insere) qualquer base existente com o mesmo
// codigo_plataforma — usado pela sincronização com leiloes.br. Se `filename`
// vier omitido, apenas remove (caso de leilão finalizado na plataforma).
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'leilao');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { codigoPlatforma, filename, count, refs, refsVendidos, pricePerRef, loteParaRef } = parsed.data;
  const pool = getAppPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM leilao_bases_ativas WHERE codigo_plataforma = $1', [codigoPlatforma]);

    if (filename) {
      await client.query(
        `INSERT INTO leilao_bases_ativas (codigo_plataforma, filename, count_pecas, refs, refs_vendidos, price_per_ref, lote_para_ref)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [codigoPlatforma, filename, count ?? 0, refs ?? [], refsVendidos ?? [], JSON.stringify(pricePerRef ?? {}), JSON.stringify(loteParaRef ?? {})]
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
