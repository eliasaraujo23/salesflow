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
    // Busca o melhor arquivo por produto: white-images > leilao, is_main primeiro
    const result = await client.query<{ ref: string; key: string; bucket: string }>(
      `SELECT DISTINCT ON (pd.referencia)
         pd.referencia AS ref,
         img.key,
         img.bucket
       FROM product_details pd
       JOIN leilao_image img ON img."productDetailsId" = pd.id
       WHERE UPPER(pd.referencia) = ANY($1)
         AND img.key IS NOT NULL
       ORDER BY
         pd.referencia,
         CASE WHEN img.is_main THEN 0 ELSE 1 END,
         CASE WHEN img.bucket = 'white-images' THEN 0 ELSE 1 END,
         img."createdAt" DESC`,
      [refs],
    );

    const images = await Promise.all(
      result.rows.map(async r => {
        try {
          const url = await getPresignedUrl(r.bucket, r.key);
          return { ref: r.ref, url };
        } catch {
          return null;
        }
      }),
    );

    return NextResponse.json({
      images: images.filter((x): x is { ref: string; url: string } => x !== null),
    });
  } finally {
    client.release();
  }
}
