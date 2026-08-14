export const maxDuration = 300;

import sharp               from 'sharp';
import { Pool }            from 'pg';
import { getPresignedUrl } from '@/lib/r2';

const BASE          = 'https://www.leiloesbr.com.br/painel_lbr';
const UA            = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const IDC           = '257103';
const ID_TIPO_JOIAS = '18';

const pool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
});

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

async function loginLeiloesbr(user: string, pass: string, numLeilao: string): Promise<string> {
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';
  const loginRes  = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionId, 'Referer': `${BASE}/default.asp?Log=off`, 'User-Agent': UA,
    },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

function mergeCookies(existing: string, res: Response): string {
  const raw = res.headers.get('set-cookie');
  if (!raw) return existing;
  const map = new Map<string, string>();
  for (const pair of existing.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) map.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  for (const part of raw.split(/,(?=\s*\w+=)/)) {
    const kv = part.trim().split(';')[0];
    const idx = kv.indexOf('=');
    if (idx > 0) map.set(kv.slice(0, idx).trim(), kv.slice(idx + 1).trim());
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

// ─── Image helpers ───────────────────────────────────────────────────────────

interface ImageKeys { principal: string | null; extras: string[]; }

function isVideo(key: string) { return /\.(mov|mp4|avi|webm)$/i.test(key); }

async function queryImageKeys(refs: string[]): Promise<Map<string, ImageKeys>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ referencia: string; key: string; is_main: boolean; is_secondary: boolean }>(
      `SELECT pd.referencia, li.key, li.is_main, li.is_secondary
       FROM product_details pd
       JOIN leilao_image li ON li."productDetailsId" = pd.id
       WHERE pd.referencia = ANY($1::text[])
       ORDER BY pd.referencia, li.is_main DESC, li.is_secondary DESC, li."createdAt" ASC`,
      [refs],
    );
    const grouped = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = grouped.get(r.referencia) ?? [];
      arr.push(r);
      grouped.set(r.referencia, arr);
    }
    const map = new Map<string, ImageKeys>();
    for (const ref of refs) {
      const images    = (grouped.get(ref) ?? []).filter(i => !isVideo(i.key));
      const main      = images.find(i => i.is_main);
      const principal = main?.key ?? images[0]?.key ?? null;
      const extras    = images.map(i => i.key).filter(k => k !== principal).slice(0, 5);
      map.set(ref, { principal, extras });
    }
    return map;
  } finally {
    client.release();
  }
}

async function processImage(buf: ArrayBuffer): Promise<Buffer> {
  const maxBytes = 1.8 * 1024 * 1024;
  const pipeline = sharp(Buffer.from(buf)).rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true });
  let quality = 90;
  let out: Buffer;
  do {
    if (quality < 20) throw new Error('Não foi possível comprimir a imagem.');
    out = await pipeline.clone().jpeg({ quality, progressive: true, mozjpeg: true }).toBuffer();
    quality -= 10;
  } while (out.byteLength > maxBytes);
  return out;
}

async function downloadImage(key: string): Promise<Buffer> {
  for (const bucket of ['white-images', 'leilao']) {
    try {
      const url = await getPresignedUrl(bucket, key);
      const res = await fetch(url);
      if (res.ok) return processImage(await res.arrayBuffer());
    } catch { /* try next bucket */ }
  }
  throw new Error(`Imagem não encontrada: ${key}`);
}

async function loadUploadPage(cookie: string, pieceId: string): Promise<string> {
  const res = await fetch(`${BASE}/subir_pecas.asp?Id=${pieceId}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow',
  });
  return mergeCookies(cookie, res);
}

async function getAvailableSlots(cookie: string, pieceId: string): Promise<{ cookie: string; slots: number[] }> {
  const res = await fetch(`${BASE}/gerenciar_imagens.asp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    body: new URLSearchParams({ ID: pieceId }).toString(),
    redirect: 'follow',
  });
  const text = await res.text();
  const updatedCookie = mergeCookies(cookie, res);
  const occupied = new Set<number>();
  for (const m of text.matchAll(/initialPreview(?:Config)?\s*:\s*\[([^\]]*)\]/g)) {
    for (const cap of m[1].matchAll(/"caption"\s*:\s*"[^"]*_(\d+)\.jpg"/g)) {
      const n = parseInt(cap[1]);
      if (n >= 1 && n <= 5) occupied.add(n);
    }
  }
  const slots: number[] = [];
  for (let i = 1; i <= 5; i++) { if (!occupied.has(i)) slots.push(i); }
  return { cookie: updatedCookie, slots };
}

async function uploadPrincipal(cookie: string, pieceId: string, numLeilao: string, buf: Buffer): Promise<string> {
  const fd = new FormData();
  fd.append('IdPeca',    pieceId);
  fd.append('NumLeilao', numLeilao);
  fd.append('Siteurl',   'https://www.leiloesbr.com.br/');
  fd.append('Foto', new Blob([buf as unknown as BlobPart], { type: 'image/jpeg' }), 'photo.jpg');
  const res = await fetch(`${BASE}/img_pecas.php`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
    body: fd, redirect: 'follow', signal: AbortSignal.timeout(60_000),
  });
  const updatedCookie = mergeCookies(cookie, res);
  const text = await res.text();
  if (!res.ok) throw new Error(`principal HTTP ${res.status}: ${text.slice(0, 100)}`);
  const s3Res = await fetch(`${BASE}/ajax/s3enviaimagem.asp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': updatedCookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp`, 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ idpeca: pieceId, index: '0', tipo: '0' }).toString(),
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  return mergeCookies(updatedCookie, s3Res);
}

async function uploadExtras(cookie: string, pieceId: string, numLeilao: string, buffers: Buffer[], freeSlots: number[]): Promise<number> {
  if (buffers.length === 0) return 0;
  const count = Math.min(buffers.length, freeSlots.length);
  let activeCookie = cookie;
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const slot = freeSlots[i];
    const fd = new FormData();
    fd.append('Foto',      new Blob([buffers[i] as unknown as BlobPart], { type: 'image/jpeg' }), `extra_${i}.jpg`);
    fd.append('file_id',   String(i));
    fd.append('compl',     String(slot));
    fd.append('IdPeca',    pieceId);
    fd.append('NumLeilao', numLeilao);
    fd.append('Siteurl',   'https://www.leiloesbr.com.br/');
    const res = await fetch(`${BASE}/img_pecas_extras.php`, {
      method: 'POST',
      headers: { 'Cookie': activeCookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
      body: fd, redirect: 'follow', signal: AbortSignal.timeout(60_000),
    });
    activeCookie = mergeCookies(activeCookie, res);
    const text = await res.text();
    if (res.ok && !text.includes('"error"')) ok++;
    if (i < count - 1) await new Promise(r => setTimeout(r, 300));
  }
  return ok;
}

// Grava peça com Site=valor (1=ativo, 0=inativo).
// Usa apenas os campos mínimos que o cad_peca.asp precisa.
async function setSite(cookie: string, pieceId: string, codigoPlatforma: string, lote: number, siteValue: '0' | '1'): Promise<void> {
  // Primeiro lê os dados atuais da peça para não sobrescrever nada
  const getRes = await fetch(`${BASE}/cad_peca.asp?ID=${pieceId}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  const html = await getRes.text();

  // Extrai os campos do formulário via regex
  function extractField(name: string): string {
    const m = html.match(new RegExp(`name=["']?${name}["']?[^>]*value=["']([^"']*?)["']`, 'i'))
           ?? html.match(new RegExp(`value=["']([^"']*?)["'][^>]*name=["']?${name}["']?`, 'i'));
    return m?.[1] ?? '';
  }
  function extractTextarea(name: string): string {
    const m = html.match(new RegExp(`<textarea[^>]*name=["']?${name}["']?[^>]*>([\\s\\S]*?)<\\/textarea>`, 'i'));
    return m?.[1]?.trim() ?? '';
  }

  const params = new URLSearchParams({
    ID:               pieceId,
    ID_Peca:          extractField('ID_Peca'),
    ID_Cliente:       IDC,
    ID_Leilao:        codigoPlatforma,
    NumLeilao:        codigoPlatforma,
    ID_Tipo:          extractField('ID_Tipo') || ID_TIPO_JOIAS,
    ID_Artista:       extractField('ID_Artista'),
    Item:             String(lote),
    Item_O:           String(lote),
    Peca:             extractField('Peca'),
    Lote:             String(lote),
    Extra:            extractField('Extra'),
    Dia:              extractField('Dia') || '1',
    oldcartela:       '',
    Cartela:          extractField('Cartela'),
    Nota:             extractField('Nota'),
    Carteado:         extractField('Carteado') || '0',
    Valor_Contratado: extractField('Valor_Contratado') || '0',
    Valor_Venda:      extractField('Valor_Venda') || '0',
    Taxa:             extractField('Taxa') || '25',
    Taxa_Leiloeiro:   extractField('Taxa_Leiloeiro') || '5',
    Descricao:        extractTextarea('Descricao'),
    Descricao_2:      extractTextarea('Descricao_2'),
    Incremento:       extractField('Incremento'),
    Dt_Nota:          extractField('Dt_Nota'),
    Dt_Acerto:        extractField('Dt_Acerto'),
    Site:             siteValue,
    Destaque:         extractField('Destaque'),
    dtVenda:          extractField('dtVenda'),
    oldCartela:       '',
    Botao:            'Gravar',
  });

  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie, 'User-Agent': UA,
      'Referer': `${BASE}/cad_peca.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: params.toString(), redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!text.startsWith('1|')) throw new Error(text.replace(/<[^>]+>/g, '').trim().slice(0, 120));
}

// ─── Route handler ────────────────────────────────────────────────────────────

interface PecaReupload {
  lote:    number;
  ref:     string;
  pieceId: string;
}

export async function POST(req: Request) {
  const body = await req.json() as {
    codigoPlatforma: string;
    nome:            string;
    pecas:           PecaReupload[];
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

      await send({ type: 'status', message: 'Carregando imagens do banco...' });
      const refs     = [...new Set(pecas.map(p => p.ref))];
      const imageMap = await queryImageKeys(refs);

      await send({ type: 'start', total: pecas.length });

      for (const peca of pecas) {
        const { pieceId, lote, ref } = peca;
        const imgKeys   = imageMap.get(ref);
        const mainKey   = imgKeys?.principal ?? null;
        const extraKeys = imgKeys?.extras ?? [];
        const hasImage  = !!mainKey;

        let pieceCookie = cookie;
        try { pieceCookie = await loadUploadPage(cookie, pieceId); } catch { /* non-fatal */ }

        if (hasImage) {
          // ── Upload foto principal ───────────────────────────────────────────
          let mainOk = false;
          let mainErr = '';
          await send({ type: 'status', message: `Lote ${lote}: enviando foto principal...` });
          try {
            const buf = await downloadImage(mainKey);
            pieceCookie = await uploadPrincipal(pieceCookie, pieceId, codigoPlatforma, buf);
            mainOk = true;
          } catch (e) { mainErr = e instanceof Error ? e.message : 'Erro foto'; }
          await send({ type: 'photoProgress', lote, slot: 'main', success: mainOk, error: mainErr || undefined });

          // ── Upload extras ──────────────────────────────────────────────────
          let extrasOk = 0;
          if (extraKeys.length > 0) {
            await send({ type: 'status', message: `Lote ${lote}: enviando ${extraKeys.length} foto(s) extra...` });
            try {
              const { cookie: gc, slots } = await getAvailableSlots(pieceCookie, pieceId);
              pieceCookie = gc;
              const bufs = await Promise.all(extraKeys.map(k => downloadImage(k)));
              extrasOk   = await uploadExtras(pieceCookie, pieceId, codigoPlatforma, bufs, slots);
            } catch (e) {
              console.error(`[reupload-fotos] Lote ${lote} extras ERRO:`, e instanceof Error ? e.message : e);
            }
            await send({ type: 'photoProgress', lote, slot: 'extra', success: extrasOk > 0, count: extrasOk });
          }

          // ── Ativar Site ────────────────────────────────────────────────────
          await send({ type: 'status', message: `Lote ${lote}: ativando Site...` });
          let siteOk = false;
          let siteErr = '';
          try {
            await setSite(pieceCookie, pieceId, codigoPlatforma, lote, '1');
            siteOk = true;
          } catch (e) { siteErr = e instanceof Error ? e.message : 'Erro site'; }
          await send({ type: 'siteProgress', lote, success: siteOk, action: 'ativar', error: siteErr || undefined });

        } else {
          // ── Sem imagem no R2 — desativar Site ─────────────────────────────
          await send({ type: 'photoProgress', lote, slot: 'main', success: false, error: `Sem imagem R2: ${ref}` });
          await send({ type: 'status', message: `Lote ${lote}: sem foto no R2, desativando Site...` });
          let siteOk = false;
          let siteErr = '';
          try {
            await setSite(pieceCookie, pieceId, codigoPlatforma, lote, '0');
            siteOk = true;
          } catch (e) { siteErr = e instanceof Error ? e.message : 'Erro site'; }
          await send({ type: 'siteProgress', lote, success: siteOk, action: 'desativar', error: siteErr || undefined });
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
