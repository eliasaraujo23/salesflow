import { NextRequest, NextResponse } from 'next/server';
import { requireAnaliseHtFinanceiro } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

export async function GET(req: NextRequest) {
  const auth = await requireAnaliseHtFinanceiro(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const uploadId = searchParams.get('uploadId');

  const pool = getAppPool();
  const result = uploadId
    ? await pool.query(
        `SELECT * FROM analise_ht_registros WHERE upload_id = $1 ORDER BY data, hora`,
        [uploadId]
      )
    : await pool.query(`SELECT * FROM analise_ht_registros ORDER BY data, hora`);

  return NextResponse.json({ httpStatus: 200, data: result.rows });
}
