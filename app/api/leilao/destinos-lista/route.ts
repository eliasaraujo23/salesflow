import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

export async function GET() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ destino: string }>(
      `SELECT destino FROM destinos WHERE destino IS NOT NULL ORDER BY destino ASC`,
    );
    return NextResponse.json({ data: rows.map(r => r.destino) });
  } finally {
    client.release();
  }
}
