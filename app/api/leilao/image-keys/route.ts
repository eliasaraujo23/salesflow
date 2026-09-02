import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth/require-auth';

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

function isVideo(key: string | null): boolean {
  if (!key) return false;
  return /\.(mov|mp4|avi|webm)$/i.test(key);
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const body = await req.json() as { refs?: unknown };
  const refs = Array.isArray(body.refs) ? (body.refs as string[]).slice(0, 1000) : [];
  if (refs.length === 0) return NextResponse.json({ data: [] });

  const client = await pool.connect();
  try {
    // Busca todas as imagens de cada ref — filtra vídeos na camada de negócio
    const { rows } = await client.query<{
      referencia:    string;
      key:           string;
      is_main:       boolean;
      is_secondary:  boolean;
      created_at:    Date;
    }>(
      `SELECT
         pd.referencia,
         li.key,
         li.is_main,
         li.is_secondary,
         li."createdAt" AS created_at
       FROM product_details pd
       JOIN leilao_image li ON li."productDetailsId" = pd.id
       WHERE pd.referencia = ANY($1::text[])
       ORDER BY pd.referencia, li.is_main DESC, li.is_secondary DESC, li."createdAt" ASC`,
      [refs],
    );

    // Agrupa por referência
    const grouped = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = grouped.get(r.referencia) ?? [];
      arr.push(r);
      grouped.set(r.referencia, arr);
    }

    const data: ImageKeysRow[] = refs.map(ref => {
      const images = grouped.get(ref) ?? [];

      // Separa por categoria, excluindo vídeos
      const mains      = images.filter(i => i.is_main     && !isVideo(i.key)).map(i => i.key);
      const secondaries= images.filter(i => i.is_secondary && !isVideo(i.key)).map(i => i.key);
      const extras     = images.filter(i => !i.is_main && !i.is_secondary && !isVideo(i.key)).map(i => i.key);

      // Pool de fotos disponíveis para fallback (ordem: mains → secondaries → extras)
      const allPhotos  = [...mains, ...secondaries, ...extras];
      const used       = new Set<string>();

      function pick(candidates: string[]): string | null {
        for (const k of candidates) {
          if (!used.has(k)) { used.add(k); return k; }
        }
        // fallback: próxima foto disponível no pool geral
        for (const k of allPhotos) {
          if (!used.has(k)) { used.add(k); return k; }
        }
        return null;
      }

      const key_principal = pick(mains);
      const key_extra_1   = pick(secondaries);
      const key_extra_2   = pick(extras);
      const key_extra_3   = pick(extras);
      const key_extra_4   = pick(extras);
      const key_extra_5   = pick(extras);

      return { mini_descricao: ref, key_principal, key_extra_1, key_extra_2, key_extra_3, key_extra_4, key_extra_5 };
    });

    return NextResponse.json({ data });
  } finally {
    client.release();
  }
}
