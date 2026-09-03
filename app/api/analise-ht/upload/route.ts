import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

const rowSchema = z.object({
  linha: z.number().int().nullable(),
  codInterno: z.string(),
  data: z.string(),
  hora: z.string(),
  feedback: z.string(),
  preco: z.string(),
  motivoNc: z.string(),
  transacao: z.string(),
  ouro24k: z.number(),
  ouro22k: z.number(),
  pt: z.number(),
  ouro750: z.number(),
  ouro720: z.number(),
  bx: z.number(),
  platina: z.number(),
  prata: z.number(),
  pesoTotal: z.number(),
  valorGasto: z.number(),
  pagoPorGrama: z.number(),
  observacao: z.string(),
  loja: z.string(),
  avaliador: z.string(),
});

const uploadSchema = z.object({
  filename: z.string().min(1),
  loja: z.string().min(1),
  anoMes: z.string().min(1),
  rows: z.array(rowSchema).min(1),
});

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { filename, loja, anoMes, rows } = parsed.data;
  const pool = getAppPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM analise_ht_uploads WHERE filename = $1', [filename]);

    const uploadResult = await client.query(
      `INSERT INTO analise_ht_uploads (filename, loja, ano_mes, row_count, uploaded_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [filename, loja, anoMes, rows.length, auth.session.email]
    );
    const uploadId = uploadResult.rows[0].id;

    const cols = [
      'upload_id', 'linha', 'cod_interno', 'data', 'hora', 'feedback', 'preco', 'motivo_nc',
      'transacao', 'ouro_24k', 'ouro_22k', 'pt', 'ouro_750', 'ouro_720', 'bx', 'platina', 'prata',
      'peso_total', 'valor_gasto', 'pago_por_grama', 'observacao', 'loja', 'avaliador',
    ];
    const values: unknown[] = [];
    const placeholders: string[] = [];
    rows.forEach((r, i) => {
      const base = i * cols.length;
      placeholders.push(`(${cols.map((_, j) => `$${base + j + 1}`).join(',')})`);
      values.push(
        uploadId, r.linha, r.codInterno, r.data, r.hora, r.feedback, r.preco, r.motivoNc,
        r.transacao, r.ouro24k, r.ouro22k, r.pt, r.ouro750, r.ouro720, r.bx, r.platina, r.prata,
        r.pesoTotal, r.valorGasto, r.pagoPorGrama, r.observacao, r.loja, r.avaliador,
      );
    });

    await client.query(
      `INSERT INTO analise_ht_registros (${cols.join(',')}) VALUES ${placeholders.join(',')}`,
      values
    );

    await client.query('COMMIT');
    return NextResponse.json({ httpStatus: 200, data: { uploadId, count: rows.length } }, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json({ httpStatus: 500, message: 'Erro ao importar CSV.' }, { status: 500 });
  } finally {
    client.release();
  }
}
