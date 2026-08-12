export const maxDuration = 300;

import { Pool }           from 'pg';
import { getPresignedUrl } from '@/lib/r2';

const BASE           = 'https://leiloesbr.com.br/painel_lbr';
const UA             = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const IDC            = '257103';
const ID_TIPO_JOIAS  = '18';

function formatBRPrice(price: number): string {
  return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

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

function cleanCell(raw: string): string {
  return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/&amp;/g, '&').trim();
}

function parseLoteId(html: string): Map<number, string> {
  const map  = new Map<number, string>();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .filter(m => m[1].includes('<td'));
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id  = cells[0]?.trim();
    const lot = cells[2]?.trim();
    // Only id needs digit check — lote may have non-breaking spaces or punctuation
    if (id && lot && /^\d+$/.test(id)) {
      const loteNum = Number(lot.replace(/\D/g, ''));
      if (loteNum > 0) map.set(loteNum, id);
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

interface ImageRow { key: string; isMain: boolean; }

async function queryImageKeys(refs: string[]): Promise<Map<string, ImageRow[]>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      referencia:   string;
      key:          string;
      is_main:      boolean;
      is_secondary: boolean;
    }>(
      `SELECT
         pd.referencia,
         li.key,
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
      arr.push({ key: r.key, isMain: r.is_main });
      map.set(r.referencia, arr);
    }
    return map;
  } finally {
    client.release();
  }
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

// Tenta white-images (comprimidas) primeiro, cai para leilao se não existir
async function downloadImage(key: string): Promise<ArrayBuffer> {
  for (const bucket of ['white-images', 'leilao']) {
    try {
      const url = await getPresignedUrl(bucket, key);
      const res = await fetch(url);
      if (res.ok) return res.arrayBuffer();
    } catch { /* try next bucket */ }
  }
  throw new Error(`Imagem não encontrada: ${key}`);
}

// Inicializa o slot no ASP — necessário para o servidor saber em qual posição gravar
// slot 0 = principal, 1-5 = extras
async function initSlot(cookie: string, pieceId: string, slot: number): Promise<void> {
  await fetch(`${BASE}/subir_pecas.asp?Id=${pieceId}&Img=${slot}`, {
    headers: {
      'Cookie':   cookie,
      'User-Agent': UA,
      'Referer':  `${BASE}/cad_peca.asp?tipo=3&ID=${pieceId}&fID=${IDC}`,
    },
    redirect: 'follow',
  });
}

// Upload de uma foto em um slot via img_pecas.php + s3enviaimagem.asp
// (principal usa slot 0, extras usam slots 1-5 — mesmo endpoint para tudo)
async function uploadToSlot(
  cookie:    string,
  pieceId:   string,
  numLeilao: string,
  buf:       ArrayBuffer,
  slot:      number,
): Promise<void> {
  const slotUrl = `${BASE}/subir_pecas.asp?Id=${pieceId}&Img=${slot}`;

  const fd = new FormData();
  fd.append('IdPeca',    pieceId);
  fd.append('NumLeilao', numLeilao);
  fd.append('Siteurl',   'https://www.leiloesbr.com.br/');
  fd.append('Foto', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg');

  const res = await fetch(`${BASE}/img_pecas.php`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': slotUrl },
    body: fd,
    redirect: 'follow',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`slot ${slot} HTTP ${res.status}: ${text.slice(0, 100)}`);
  console.log(`[upload-fotos] slot ${slot} resp: ${text.slice(0, 80)}`);

  // Trigger S3 — index sempre '0' (posição no buffer temp), tipo '0'=principal '1'=extra
  const tipo = slot === 0 ? '0' : '1';
  const s3Res = await fetch(`${BASE}/ajax/s3enviaimagem.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Referer':          slotUrl,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ idpeca: pieceId, index: '0', tipo }).toString(),
    redirect: 'follow',
  });
  const s3Text = await s3Res.text();
  console.log(`[upload-fotos] slot ${slot} s3 resp: ${s3Text.slice(0, 80)}`);
}

// ─── Activate Site ────────────────────────────────────────────────────────────

async function activateSite(
  cookie:          string,
  pieceId:         string,
  peca:            PecaForPhotos,
  codigoPlatforma: string,
): Promise<void> {
  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Referer':          `${BASE}/cad_peca.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      ID:               pieceId,
      ID_Peca:          '',
      ID_Cliente:       IDC,
      ID_Leilao:        codigoPlatforma,
      NumLeilao:        codigoPlatforma,
      ID_Tipo:          ID_TIPO_JOIAS,
      ID_Artista:       '',
      Item:             String(peca.lote),
      Item_O:           String(peca.lote),
      Peca:             peca.peca,
      Lote:             String(peca.lote),
      Extra:            '',
      Dia:              String(peca.dia),
      oldcartela:       '',
      Cartela:          '',
      Nota:             '',
      Carteado:         '0',
      Valor_Contratado: formatBRPrice(peca.preco_contratado),
      Valor_Venda:      '0',
      Taxa:             '25',
      Taxa_Leiloeiro:   '5',
      Descricao:        peca.descricao,
      Descricao_2:      peca.segunda_descricao,
      Incremento:       '',
      Dt_Nota:          '',
      Dt_Acerto:        '',
      Site:             '1',
      Destaque:         '',
      dtVenda:          '',
      oldCartela:       '',
      Botao:            'Gravar',
    }).toString(),
    redirect: 'follow',
  });
  const text = await res.text();
  if (!text.startsWith('1|')) throw new Error(text.replace(/<[^>]+>/g, '').trim().slice(0, 120));
}

// ─── Route handler ────────────────────────────────────────────────────────────

interface PecaForPhotos {
  lote:              number;
  referencia:        string;
  peca:              string;
  dia:               number;
  preco_contratado:  number;
  descricao:         string;
  segunda_descricao: string;
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

        // Upload principal: init slot 0 → img_pecas.php → s3
        let mainOk = false;
        let mainErr = '';
        if (mainImg) {
          try {
            await initSlot(cookie, pieceId, 0);
            const buf = await downloadImage(mainImg.key);
            await uploadToSlot(cookie, pieceId, codigoPlatforma, buf, 0);
            mainOk = true;
          } catch (e) { mainErr = e instanceof Error ? e.message : 'Erro foto'; }
        } else {
          mainErr = `Sem imagem no banco: ${peca.referencia}`;
        }
        await send({ type: 'photoProgress', lote: peca.lote, slot: 'main', success: mainOk, error: mainErr || undefined });

        // Upload extras: cada uma em seu slot (1-5) via mesmo pipeline
        let extrasOk = 0;
        if (extraImgs.length > 0) {
          console.log(`[upload-fotos] Lote ${peca.lote}: ${extraImgs.length} extras`);
          for (let i = 0; i < extraImgs.length; i++) {
            const slot = i + 1;
            try {
              await initSlot(cookie, pieceId, slot);
              const buf = await downloadImage(extraImgs[i].key);
              await uploadToSlot(cookie, pieceId, codigoPlatforma, buf, slot);
              extrasOk++;
            } catch (e) {
              console.error(`[upload-fotos] Lote ${peca.lote} extra slot ${slot} ERRO:`, e instanceof Error ? e.message : e);
            }
          }
          await send({ type: 'photoProgress', lote: peca.lote, slot: 'extra', success: extrasOk > 0, count: extrasOk });
        }

        // Ativar Site após foto(s)
        let siteOk = false;
        let siteErr = '';
        try {
          await activateSite(cookie, pieceId, peca, codigoPlatforma);
          siteOk = true;
        } catch (e) { siteErr = e instanceof Error ? e.message : 'Erro site'; }
        await send({ type: 'siteProgress', lote: peca.lote, success: siteOk, error: siteErr || undefined });
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
