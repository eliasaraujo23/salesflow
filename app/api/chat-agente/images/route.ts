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
    // Traz até 3 fotos por peça: principal, secundária, e uma foto "site" (is_eternno) extra
    // quando ela não coincidir com nenhuma das duas — essas são as fotos aprovadas para o site.
    // category: 0 = principal, 1 = secundária, 2 = site (Eternno) adicional.
    const result = await client.query<{ ref: string; key: string; bucket: string; category: number; is_eternno: boolean }>(
      `SELECT DISTINCT ON (pd.referencia, categorized.category)
         pd.referencia AS ref, categorized.key, categorized.bucket, categorized.category, categorized.is_eternno
       FROM product_details pd
       JOIN (
         SELECT img."productDetailsId", img.key, img.bucket, img.is_eternno, img."createdAt",
           CASE WHEN img.is_main THEN 0 WHEN img.is_secondary THEN 1 ELSE 2 END AS category
         FROM leilao_image img
         WHERE img.key IS NOT NULL AND (img.is_main OR img.is_secondary OR img.is_eternno)
       ) categorized ON categorized."productDetailsId" = pd.id
       WHERE UPPER(pd.referencia) = ANY($1)
       ORDER BY
         pd.referencia, categorized.category,
         CASE WHEN categorized.bucket = 'white-images' THEN 0 ELSE 1 END,
         categorized."createdAt" DESC`,
      [refs],
    );

    const resolved = await Promise.all(
      result.rows.map(async r => {
        try {
          const url = await getPresignedUrl(r.bucket, r.key);
          return { ref: r.ref, url, category: r.category, is_eternno: r.is_eternno };
        } catch {
          return null;
        }
      }),
    );

    const images = resolved
      .filter((x): x is { ref: string; url: string; category: number; is_eternno: boolean } => x !== null)
      .sort((a, b) => a.category - b.category)
      .map(({ ref, url, is_eternno }) => ({ ref, url, is_eternno }));

    return NextResponse.json({ images });
  } finally {
    client.release();
  }
}
