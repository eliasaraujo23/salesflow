import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getPresignedUrl } from '@/lib/r2';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

export async function GET(req: NextRequest) {
  const refsParam = req.nextUrl.searchParams.get('refs');
  if (!refsParam) return NextResponse.json({ images: [] });

  const refs = refsParam
    .split(',')
    .map(r => r.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 20); // max 20 refs por request

  if (refs.length === 0) return NextResponse.json({ images: [] });

  const client = await pool.connect();
  try {
    // Traz apenas as fotos marcadas is_eternno (aprovadas para o site) por peça, até 5 por referência.
    const result = await client.query<{ ref: string; key: string; bucket: string }>(
      `SELECT ref, key, bucket FROM (
         SELECT
           pd.referencia AS ref, img.key, img.bucket,
           ROW_NUMBER() OVER (
             PARTITION BY pd.referencia
             ORDER BY CASE WHEN img.bucket = 'white-images' THEN 0 ELSE 1 END, img."createdAt" DESC
           ) AS rn
         FROM product_details pd
         JOIN leilao_image img ON img."productDetailsId" = pd.id
         WHERE UPPER(pd.referencia) = ANY($1)
           AND img.key IS NOT NULL
           AND img.is_eternno = true
       ) ranked
       WHERE rn <= 5`,
      [refs],
    );

    const resolved = await Promise.all(
      result.rows.map(async r => {
        try {
          const url = await getPresignedUrl(r.bucket, r.key);
          return { ref: r.ref, url };
        } catch {
          return null;
        }
      }),
    );

    const images = resolved.filter((x): x is { ref: string; url: string } => x !== null);

    return NextResponse.json({ images });
  } finally {
    client.release();
  }
}
