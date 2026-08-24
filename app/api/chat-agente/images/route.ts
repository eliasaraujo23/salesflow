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
    // Busca a principal e a secundária por produto: white-images > leilao, dentro de cada uma
    const result = await client.query<{ ref: string; key: string; bucket: string; is_main: boolean }>(
      `SELECT DISTINCT ON (pd.referencia, img.is_main)
         pd.referencia AS ref,
         img.key,
         img.bucket,
         img.is_main
       FROM product_details pd
       JOIN leilao_image img ON img."productDetailsId" = pd.id
       WHERE UPPER(pd.referencia) = ANY($1)
         AND img.key IS NOT NULL
         AND (img.is_main OR img.is_secondary)
       ORDER BY
         pd.referencia, img.is_main DESC,
         CASE WHEN img.bucket = 'white-images' THEN 0 ELSE 1 END,
         img."createdAt" DESC`,
      [refs],
    );

    const resolved = await Promise.all(
      result.rows.map(async r => {
        try {
          const url = await getPresignedUrl(r.bucket, r.key);
          return { ref: r.ref, url, is_main: r.is_main };
        } catch {
          return null;
        }
      }),
    );

    const images = resolved
      .filter((x): x is { ref: string; url: string; is_main: boolean } => x !== null)
      .sort((a, b) => Number(b.is_main) - Number(a.is_main))
      .map(({ ref, url }) => ({ ref, url }));

    return NextResponse.json({ images });
  } finally {
    client.release();
  }
}
