import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth/require-auth';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

// PATCH — toggle excluded
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { excluded } = await req.json() as { excluded: boolean };
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE leilao_bases_ativas SET excluded = $1 WHERE id = $2`,
      [excluded, Number(id)]
    );
    return NextResponse.json({ ok: true });
  } finally {
    client.release();
  }
}

// DELETE — remove base
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM leilao_bases_ativas WHERE id = $1`, [Number(id)]);
    return NextResponse.json({ ok: true });
  } finally {
    client.release();
  }
}
