import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAnaliseHtFinanceiro } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

function mapRow(row: any) {
  return {
    id: row.id,
    uploadId: row.upload_id,
    referencia: row.referencia,
    avaliador: row.avaliador,
    valor: Number(row.valor),
    motivo: row.motivo,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAnaliseHtFinanceiro(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const uploadIds = searchParams.getAll('uploadId');
  const referencias = searchParams.getAll('referencia');

  const pool = getAppPool();
  const result = uploadIds.length > 0 || referencias.length > 0
    ? await pool.query(
        `SELECT id, upload_id, referencia, avaliador, valor, motivo FROM analise_ht_gratificacao
         WHERE upload_id = ANY($1) OR referencia = ANY($2)`,
        [uploadIds, referencias]
      )
    : await pool.query(`SELECT id, upload_id, referencia, avaliador, valor, motivo FROM analise_ht_gratificacao`);

  return NextResponse.json({ httpStatus: 200, data: result.rows.map(mapRow) });
}

const addSchema = z.object({
  uploadId: z.string().min(1).optional(),
  referencia: z.string().min(1).optional(),
  avaliador: z.string().min(1),
  valor: z.number(),
  motivo: z.string().optional(),
}).refine(v => !!v.uploadId || !!v.referencia, { message: 'Informe uploadId ou referencia.' });

export async function POST(req: NextRequest) {
  const auth = await requireAnaliseHtFinanceiro(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ httpStatus: 400, message: 'Dados inválidos.', errors: parsed.error }, { status: 400 });
  }

  const { uploadId, referencia, avaliador, valor, motivo } = parsed.data;
  const pool = getAppPool();

  const result = uploadId
    ? await pool.query(
        `INSERT INTO analise_ht_gratificacao (upload_id, avaliador, valor, motivo) VALUES ($1,$2,$3,$4)
         ON CONFLICT (upload_id, avaliador) WHERE upload_id IS NOT NULL DO UPDATE SET valor = EXCLUDED.valor, motivo = EXCLUDED.motivo
         RETURNING id, upload_id, referencia, avaliador, valor, motivo`,
        [uploadId, avaliador, valor, motivo ?? null]
      )
    : await pool.query(
        `INSERT INTO analise_ht_gratificacao (referencia, avaliador, valor, motivo) VALUES ($1,$2,$3,$4)
         ON CONFLICT (referencia, avaliador) WHERE referencia IS NOT NULL DO UPDATE SET valor = EXCLUDED.valor, motivo = EXCLUDED.motivo
         RETURNING id, upload_id, referencia, avaliador, valor, motivo`,
        [referencia, avaliador, valor, motivo ?? null]
      );

  return NextResponse.json({ httpStatus: 200, data: mapRow(result.rows[0]) }, { status: 201 });
}
