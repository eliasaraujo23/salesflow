import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { z } from 'zod';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

async function ensureTable(client: import('pg').PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS leilao_bases_ativas (
      id                SERIAL PRIMARY KEY,
      codigo_plataforma VARCHAR(20),
      filename          VARCHAR(500) NOT NULL,
      count_pecas       INTEGER      NOT NULL DEFAULT 0,
      refs              TEXT[]       NOT NULL DEFAULT '{}',
      refs_vendidos     TEXT[]       NOT NULL DEFAULT '{}',
      excluded          BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  // Adiciona coluna em tabelas criadas antes desta versão
  await client.query(`
    ALTER TABLE leilao_bases_ativas
    ADD COLUMN IF NOT EXISTS refs_vendidos TEXT[] NOT NULL DEFAULT '{}'
  `);
}

// GET — list all bases
export async function GET() {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const { rows } = await client.query(
      `SELECT id, codigo_plataforma, filename, count_pecas, refs, refs_vendidos, excluded, created_at
       FROM leilao_bases_ativas
       ORDER BY codigo_plataforma ASC NULLS LAST, created_at ASC`
    );
    return NextResponse.json({ data: rows });
  } finally {
    client.release();
  }
}

// POST — add a new base
const postSchema = z.object({
  codigoPlatforma: z.string().nullable(),
  filename:        z.string().min(1),
  count:           z.number().int().min(0),
  refs:            z.array(z.string()),
  refsVendidos:    z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 });

  const { codigoPlatforma, filename, count, refs, refsVendidos } = parsed.data;
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const { rows } = await client.query(
      `INSERT INTO leilao_bases_ativas (codigo_plataforma, filename, count_pecas, refs, refs_vendidos)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [codigoPlatforma, filename, count, refs, refsVendidos]
    );
    if (rows.length === 0) {
      const existing = await client.query(
        `SELECT id FROM leilao_bases_ativas WHERE filename = $1`, [filename]
      );
      return NextResponse.json({ id: existing.rows[0]?.id });
    }
    return NextResponse.json({ id: rows[0].id });
  } finally {
    client.release();
  }
}
