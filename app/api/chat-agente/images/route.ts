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
    // Traz até 4 fotos por peça: principal, secundária, e até 2 fotos extras marcadas
    // is_eternno (aprovadas para o site) que não coincidam com as duas primeiras.
    // category: 0 = principal, 1 = secundária, 2 = extras "site" (rankeadas entre si).
    const result = await client.query<{ ref: string; key: string; bucket: string; category: number }>(
      `SELECT ref, key, bucket, category FROM (
         SELECT
           pd.referencia AS ref, categorized.key, categorized.bucket, categorized.category,
           ROW_NUMBER() OVER (
             PARTITION BY pd.referencia, categorized.category
             ORDER BY CASE WHEN categorized.bucket = 'white-images' THEN 0 ELSE 1 END, categorized."createdAt" DESC
           ) AS rn
         FROM product_details pd
         JOIN (
           SELECT img."productDetailsId", img.key, img.bucket, img.is_eternno, img."createdAt",
             CASE WHEN img.is_main THEN 0 WHEN img.is_secondary THEN 1 ELSE 2 END AS category
           FROM leilao_image img
           WHERE img.key IS NOT NULL AND (img.is_main OR img.is_secondary OR img.is_eternno)
         ) categorized ON categorized."productDetailsId" = pd.id
         WHERE UPPER(pd.referencia) = ANY($1)
       ) ranked
       WHERE (category < 2 AND rn = 1) OR (category = 2 AND rn <= 2)
       ORDER BY ref, category, rn`,
      [refs],
    );

    const resolved = await Promise.all(
      result.rows.map(async r => {
        try {
          const url = await getPresignedUrl(r.bucket, r.key);
          return { ref: r.ref, url, category: r.category };
        } catch {
          return null;
        }
      }),
    );

    const images = resolved
      .filter((x): x is { ref: string; url: string; category: number } => x !== null)
      .map(({ ref, url }) => ({ ref, url }));

    return NextResponse.json({ images });
  } finally {
    client.release();
  }
}
