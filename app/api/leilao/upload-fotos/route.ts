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

// Mescla Set-Cookie da resposta ao cookie ativo (mantém PHPSESSID entre chamadas PHP)
function mergeCookies(existing: string, res: Response): string {
  const raw = res.headers.get('set-cookie');
  if (!raw) return existing;
  const map = new Map<string, string>();
  for (const pair of existing.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) map.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  // Set-Cookie pode conter vírgula no valor; separamos por padrão "nome=valor;"
  for (const part of raw.split(/,(?=\s*\w+=)/)) {
    const kv = part.trim().split(';')[0];
    const idx = kv.indexOf('=');
    if (idx > 0) map.set(kv.slice(0, idx).trim(), kv.slice(idx + 1).trim());
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

// Carrega a página de edição — estabelece sessão PHP além do contexto ASP
async function loadEditPage(cookie: string, pieceId: string): Promise<string> {
  const res = await fetch(`${BASE}/cad_peca.asp?tipo=3&ID=${pieceId}&fID=${IDC}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow',
  });
  const updatedCookie = mergeCookies(cookie, res);
  const html = await res.text();
  console.log('[upload-fotos] edit-url:', res.url, '| html[0:200]:', html.slice(0, 200).replace(/\s+/g, ' '));
  return updatedCookie;
}

// Upload da imagem principal via img_pecas.php + s3enviaimagem.asp
// Retorna cookie atualizado (incluindo PHPSESSID do servidor PHP)
async function uploadPrincipal(
  cookie:    string,
  pieceId:   string,
  numLeilao: string,
  buf:       ArrayBuffer,
): Promise<string> {
  const fd = new FormData();
  fd.append('IdPeca',    pieceId);
  fd.append('NumLeilao', numLeilao);
  fd.append('Siteurl',   'https://www.leiloesbr.com.br/');
  fd.append('Foto', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg');

  const res = await fetch(`${BASE}/img_pecas.php`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
    body: fd,
    redirect: 'follow',
  });
  // Captura PHPSESSID que img_pecas.php pode estabelecer
  const updatedCookie = mergeCookies(cookie, res);

  const text = await res.text();
  if (!res.ok) throw new Error(`principal HTTP ${res.status}: ${text.slice(0, 100)}`);
  console.log(`[upload-fotos] principal resp: ${text.slice(0, 80)}`);

  const s3Res = await fetch(`${BASE}/ajax/s3enviaimagem.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': updatedCookie, 'User-Agent': UA,
      'Referer': `${BASE}/cad_peca.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ idpeca: pieceId, index: '0', tipo: '0' }).toString(),
    redirect: 'follow',
  });
  const s3Cookie = mergeCookies(updatedCookie, s3Res);
  console.log(`[upload-fotos] principal s3: ${(await s3Res.text()).slice(0, 80)}`);
  return s3Cookie;
}

// Upload extras: img_pecas.php salva no temp (imagens/temp/{pieceId}),
// depois s3enviaimagem(index=i, tipo=1) commita do temp para o slot de extra i.
// img_pecas_extras.php escreve direto no S3 com chave fixa ({id}_.jpg) → sempre sobrescreve.
// Usando img_pecas.php cada extra vai para o mesmo temp, mas s3enviaimagem com index crescente
// salva em slots distintos: extra_0, extra_1, extra_2…
async function uploadExtras(
  cookie:    string,
  pieceId:   string,
  numLeilao: string,
  buffers:   ArrayBuffer[],
): Promise<number> {
  let activeCookie = cookie;
  let ok = 0;
  for (let i = 0; i < buffers.length; i++) {
    // 1. Carrega extra no slot temp via img_pecas.php
    const fd = new FormData();
    fd.append('IdPeca',    pieceId);
    fd.append('NumLeilao', numLeilao);
    fd.append('Siteurl',   'https://www.leiloesbr.com.br/');
    fd.append('Foto', new Blob([buffers[i]], { type: 'image/jpeg' }), `extra_${i}.jpg`);

    const phpRes = await fetch(`${BASE}/img_pecas.php`, {
      method: 'POST',
      headers: { 'Cookie': activeCookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
      body: fd,
      redirect: 'follow',
    });
    activeCookie = mergeCookies(activeCookie, phpRes);
    const phpText = await phpRes.text();
    console.log(`[upload-fotos] extra[${i}] php: ${phpText.slice(0, 80)}`);
    if (!phpRes.ok || phpText.includes('"error"')) continue;

    // 2. Commita temp → slot de extra i (index=i, tipo=1 = "é extra")
    const s3Res = await fetch(`${BASE}/ajax/s3enviaimagem.asp`, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/x-www-form-urlencoded',
        'Cookie':           activeCookie,
        'User-Agent':       UA,
        'Referer':          `${BASE}/cad_peca.asp`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({ idpeca: pieceId, index: String(i), tipo: '1' }).toString(),
      redirect: 'follow',
    });
    activeCookie = mergeCookies(activeCookie, s3Res);
    const s3Text = await s3Res.text();
    console.log(`[upload-fotos] extra[${i}] s3(index=${i},tipo=1): ${s3Text.slice(0, 80)}`);
    ok++;
  }
  return ok;
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

        // Carregar página de edição — captura PHPSESSID junto com ASPSESSIONID
        let pieceCookie = cookie;
        try { pieceCookie = await loadEditPage(cookie, pieceId); } catch { /* non-fatal */ }

        // Upload principal (foto marcada is_main no sistema) → img_pecas.php
        // uploadPrincipal retorna cookie atualizado com PHPSESSID para usar nas extras
        let mainOk = false;
        let mainErr = '';
        if (mainImg) {
          try {
            const buf = await downloadImage(mainImg.key);
            pieceCookie = await uploadPrincipal(pieceCookie, pieceId, codigoPlatforma, buf);
            mainOk = true;
          } catch (e) { mainErr = e instanceof Error ? e.message : 'Erro foto'; }
        } else {
          mainErr = `Sem imagem no banco: ${peca.referencia}`;
        }
        await send({ type: 'photoProgress', lote: peca.lote, slot: 'main', success: mainOk, error: mainErr || undefined });

                // Upload extras: img_pecas.php → temp → s3enviaimagem(index=i, tipo=1)
        let extrasOk = 0;
        if (extraImgs.length > 0) {
          console.log(`[upload-fotos] Lote ${peca.lote}: ${extraImgs.length} extras`);
          try {
            const bufs = await Promise.all(extraImgs.map(img => downloadImage(img.key)));
            extrasOk = await uploadExtras(pieceCookie, pieceId, codigoPlatforma, bufs);
          } catch (e) {
            console.error(`[upload-fotos] Lote ${peca.lote} extras ERRO:`, e instanceof Error ? e.message : e);
          }
          await send({ type: 'photoProgress', lote: peca.lote, slot: 'extra', success: extrasOk > 0, count: extrasOk });
        }

        // Ativar Site após foto(s)
        let siteOk = false;
        let siteErr = '';
        try {
          await activateSite(pieceCookie, pieceId, peca, codigoPlatforma);
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
