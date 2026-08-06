import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

export interface ImageKeysRow {
  mini_descricao: string;
  key_principal:  string | null;
  key_extra_1:    string | null;
  key_extra_2:    string | null;
  key_extra_3:    string | null;
  key_extra_4:    string | null;
  key_extra_5:    string | null;
}

export async function POST(req: Request) {
  const body = await req.json() as { refs?: unknown };
  const refs = Array.isArray(body.refs) ? (body.refs as string[]).slice(0, 1000) : [];
  if (refs.length === 0) return NextResponse.json({ data: [] });

  const client = await pool.connect();
  try {
    const { rows } = await client.query<ImageKeysRow>(
      `SELECT
         pd.referencia                                                            AS mini_descricao,
         main_img.key                                                             AS key_principal,
         sec_img.key                                                              AS key_extra_1,
         MAX(CASE WHEN extras.rn = 1 THEN extras.key END)                        AS key_extra_2,
         MAX(CASE WHEN extras.rn = 2 THEN extras.key END)                        AS key_extra_3,
         MAX(CASE WHEN extras.rn = 3 THEN extras.key END)                        AS key_extra_4,
         MAX(CASE WHEN extras.rn = 4 THEN extras.key END)                        AS key_extra_5
       FROM product_details pd
       LEFT JOIN leilao_image main_img
         ON main_img."productDetailsId" = pd.id AND main_img.is_main = true
       LEFT JOIN leilao_image sec_img
         ON sec_img."productDetailsId" = pd.id  AND sec_img.is_secondary = true
       LEFT JOIN (
         SELECT
           key,
           "productDetailsId",
           ROW_NUMBER() OVER (PARTITION BY "productDetailsId" ORDER BY "createdAt") AS rn
         FROM leilao_image
         WHERE is_main = false AND is_secondary = false
       ) extras ON extras."productDetailsId" = pd.id
       WHERE pd.referencia = ANY($1::text[])
       GROUP BY pd.referencia, main_img.key, sec_img.key`,
      [refs],
    );

    return NextResponse.json({ data: rows });
  } finally {
    client.release();
  }
}
