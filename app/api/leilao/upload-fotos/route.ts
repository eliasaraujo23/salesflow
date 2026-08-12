export const maxDuration = 300;

import { Pool }           from 'pg';
import { getPresignedUrl } from '@/lib/r2';

const BASE = 'https://leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

// ─── Credentials ─────────────────────────────────────────────────────────────

function getCreds(nome: string): { user: string; pass: string } | null {
  const n = nome.toUpperCase();
  if (n.startsWith('ETERNNO')) {
    const user = process.env.LEILOESBR_USER_ETERNNO;
    const pass = process.env.LEILOESBR_PASS_ETERNNO;
    return user && pass ? { user, pass } : null;
  }
  if (n.startsWith('BRUNO')) {
    const user = process.env.LEILOESBR_USER_BARAUJO;
    const pass = process.env.LEILOESBR_PASS_BARAUJO;
    return user && pass ? { user, pass } : null;
  }
  return null;
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function loginLeiloesbr(user: string, pass: string, numLeilao: string): Promise<string> {
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';

  const loginRes = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionId,
      'Referer': `${BASE}/default.asp?Log=off`,
      'User-Agent': UA,
    },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });

  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

// ─── Listing scrape: lote → internal piece ID ─────────────────────────────────

function parseLoteId(html: string): Map<number, string> {
  const map  = new Map<number, string>();
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? [])
      .map(c => c.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim());
    if (cells.length < 3) continue;
    const id  = cells[0];
    const lot = cells[2];
    if (/^\d+$/.test(id) && /^\d+$/.test(lot)) {
      map.set(Number(lot), id);
    }
  }
  return map;
}

async function scrapeListing(cookie: string, numLeilao: string): Promise<Map<number, string>> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      'User-Agent': UA,
    },
    body: new URLSearchParams({
      Listar: 'on',
      Leilao: numLeilao,
      Botao:  'Pesquisar',
      Tipo:   '1',
    }).toString(),
  });
  return parseLoteId(await res.text());
}

// ─── DB: image keys ───────────────────────────────────────────────────────────

interface ImageRow { key: string; bucket: string; isMain: boolean; }

async function queryImageKeys(refs: string[]): Promise<Map<string, ImageRow[]>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      referencia:   string;
      key:          string;
      bucket:       string;
      is_main:      boolean;
      is_secondary: boolean;
    }>(
      `SELECT
         pd.referencia,
         li.key,
         COALESCE(li.bucket, 'leilao') AS bucket,
         li.is_main,
         li.is_secondary
       FROM product_details pd
       JOIN leilao_image li ON li."productDetailsId" = pd.id
       WHERE pd.referencia = ANY($1::text[])
         AND li.key !~* '\\.(mov|mp4|avi|webm)$'
       ORDER BY pd.referencia,
                li.is_main DESC,
                li.is_secondary DESC,
                li."createdAt" ASC`,
      [refs],
    );

    const map = new Map<string, ImageRow[]>();
    for (const r of rows) {
      const arr = map.get(r.referencia) ?? [];
      arr.push({ key: r.key, bucket: r.bucket, isMain: r.is_main });
      map.set(r.referencia, arr);
    }
    return map;
  } finally {
    client.release();
  }
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

async function downloadFromR2(bucket: string, key: string): Promise<ArrayBuffer> {
  const url = await getPresignedUrl(bucket, key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`R2 ${res.status}`);
  return res.arrayBuffer();
}

async function uploadPhoto(
  cookie:      string,
  pieceId:     string,
  numLeilao:   string,
  imageBuffer: ArrayBuffer,
): Promise<void> {
  const fd = new FormData();
  fd.append('IdPeca',   pieceId);
  fd.append('NumLeilao', numLeilao);
  fd.append('Siteurl',  'https://www.leiloesbr.com.br/');
  fd.append('Foto', new Blob([imageBuffer], { type: 'image/jpeg' }), 'photo.jpg');

  const res = await fetch(`${BASE}/img_pecas.php`, {
    method: 'POST',
    headers: {
      'Cookie':   cookie,
      'User-Agent': UA,
      'Referer':  `${BASE}/subir_pecas.asp?Id=${pieceId}&Img=0`,
    },
    body: fd,
  });
  if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
}

async function triggerS3(cookie: string, pieceId: string): Promise<void> {
  const res = await fetch(`${BASE}/ajax/s3enviaimagem.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/x-www-form-urlencoded',
      'Cookie':            cookie,
      'User-Agent':        UA,
      'Referer':           `${BASE}/subir_pecas.asp?Id=${pieceId}&Img=0`,
      'X-Requested-With':  'XMLHttpRequest',
    },
    body: new URLSearchParams({ idpeca: pieceId, index: '0', tipo: '0' }).toString(),
  });
  if (!res.ok) throw new Error(`s3 HTTP ${res.status}`);
}

// ─── Route handler ────────────────────────────────────────────────────────────

interface PecaForPhotos {
  lote:       number;
  referencia: string;
}

export async function POST(req: Request) {
  const body = await req.json() as {
    codigoPlatforma: string;
    nome:            string;
    pecas:           PecaForPhotos[];
  };

  const { codigoPlatforma, nome, pecas } = body;
  if (!codigoPlatforma || !nome || !Array.isArray(pecas) || pecas.length === 0) {
    return new Response('Payload inválido', { status: 400 });
  }

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const enc    = new TextEncoder();

  const send = async (data: Record<string, unknown>) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      const creds = getCreds(nome);
      if (!creds) {
        await send({ type: 'error', message: `Sem credenciais para "${nome}"` });
        return;
      }

      await send({ type: 'status', message: 'Autenticando...' });
      const cookie = await loginLeiloesbr(creds.user, creds.pass, codigoPlatforma);

      await send({ type: 'status', message: 'Buscando IDs das peças...' });
      const loteIdMap = await scrapeListing(cookie, codigoPlatforma);

      const withId = pecas.filter(p => loteIdMap.has(p.lote));
      if (withId.length === 0) {
        await send({ type: 'error', message: 'IDs das peças não encontrados no leilão.' });
        return;
      }

      await send({ type: 'status', message: 'Carregando imagens do banco...' });
      const refs     = [...new Set(withId.map(p => p.referencia))];
      const imageMap = await queryImageKeys(refs);

      await send({ type: 'start', total: withId.length });

      for (const peca of withId) {
        const pieceId = loteIdMap.get(peca.lote)!;
        const images  = imageMap.get(peca.referencia) ?? [];

        // First image marked is_main; fallback to first available
        const mainImg   = images.find(i => i.isMain) ?? images[0];
        const extraImgs = images.filter(i => i !== mainImg).slice(0, 5);

        // Upload principal
        let mainOk = false;
        if (mainImg) {
          try {
            const buf = await downloadFromR2(mainImg.bucket, mainImg.key);
            await uploadPhoto(cookie, pieceId, codigoPlatforma, buf);
            await triggerS3(cookie, pieceId);
            mainOk = true;
          } catch { /* mainOk stays false */ }
        }
        await send({ type: 'photoProgress', lote: peca.lote, slot: 'main', success: mainOk });

        // Upload extras
        let extrasOk = 0;
        for (const extra of extraImgs) {
          try {
            const buf = await downloadFromR2(extra.bucket, extra.key);
            await uploadPhoto(cookie, pieceId, codigoPlatforma, buf);
            await triggerS3(cookie, pieceId);
            extrasOk++;
          } catch { /* continue to next extra */ }
        }
        if (extraImgs.length > 0) {
          await send({ type: 'photoProgress', lote: peca.lote, slot: 'extra', success: extrasOk > 0, count: extrasOk });
        }
      }

      await send({ type: 'done' });
    } catch (err) {
      await send({ type: 'error', message: err instanceof Error ? err.message : 'Erro interno' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache, no-transform',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
