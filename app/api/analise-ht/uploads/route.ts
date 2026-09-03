import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/require-auth';
import { getAppPool } from '@/lib/app-db';

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, 'analise-ht');
  if (!auth.ok) return auth.response;

  const pool = getAppPool();
  const result = await pool.query(
    `SELECT id, filename, loja, ano_mes, row_count, uploaded_by, created_at
     FROM analise_ht_uploads ORDER BY created_at DESC`
  );
  return NextResponse.json({ httpStatus: 200, data: result.rows });
}
