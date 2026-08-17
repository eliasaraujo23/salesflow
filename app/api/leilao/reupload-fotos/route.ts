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

// Grava Site=valor (1=ativo, 0=inativo) sem alterar nenhum outro campo.
// Lê o HTML do formulário e reposta TODOS os campos existentes, trocando só Site.
async function setSite(cookie: string, pieceId: string, codigoPlatforma: string, lote: number, siteValue: '0' | '1'): Promise<void> {
  const getRes = await fetch(`${BASE}/cad_peca.asp?ID=${pieceId}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  const html = await getRes.text();

  // Coleta TODOS os campos do formulário preservando seus valores originais
  const fields = new Map<string, string>();

  // inputs (text, hidden, number, date, etc.) — captura name e value
  for (const m of html.matchAll(/<input[^>]+>/gi)) {
    const tag  = m[0];
    const type = (tag.match(/type=["']?([^"'\s>]+)/i)?.[1] ?? 'text').toLowerCase();
    if (type === 'submit' || type === 'button' || type === 'image') continue;
    const name  = tag.match(/name=["']([^"']+)["']/i)?.[1];
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '';
    if (name) fields.set(name, value);
  }

  // selects — captura o option com selected
  for (const m of html.matchAll(/<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)) {
    const name    = m[1];
    const inner   = m[2];
    const selOpt  = inner.match(/<option[^>]+selected[^>]*value=["']([^"']*)["']/i)
                 ?? inner.match(/<option[^>]+value=["']([^"']*)["'][^>]*selected/i);
    const firstOpt = inner.match(/<option[^>]+value=["']([^"']*)["']/i);
    fields.set(name, selOpt?.[1] ?? firstOpt?.[1] ?? '');
  }

  // textareas — preserva conteúdo completo incluindo HTML entities e quebras de linha
  for (const m of html.matchAll(/<textarea[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/textarea>/gi)) {
    fields.set(m[1], m[2]); // não faz trim — preserva espaços/newlines originais
  }

  // checkboxes — Site é o único que nos importa; os outros podem estar ausentes no POST se desmarcados
  // Sobrescreve apenas Site com o valor desejado
  fields.set('Site',     siteValue);
  fields.set('Botao',    'Gravar');
  fields.set('NumLeilao', codigoPlatforma);

  const params = new URLSearchParams();
  for (const [k, v] of fields) params.append(k, v);

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
  lote:         number;
  ref:          string;
  pieceId:      string;
  temPrincipal: boolean;
  temExtra:     boolean;
  ativarSite?:  boolean; // false = destino excluído (comodato, parceiro); default true
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
        const { pieceId, lote, ref, temPrincipal, ativarSite = true } = peca;
        const imgKeys   = imageMap.get(ref);
        const mainKey   = imgKeys?.principal ?? null;
        const extraKeys = imgKeys?.extras ?? [];
        const hasR2     = !!mainKey;

        let pieceCookie = cookie;
        try { pieceCookie = await loadUploadPage(cookie, pieceId); } catch { /* non-fatal */ }

        // ── Upload foto principal (só se não tem E tem R2) ────────────────────
        let principalFinal = temPrincipal; // já tinha antes do reupload
        if (!temPrincipal) {
          if (hasR2) {
            let mainOk = false;
            let mainErr = '';
            await send({ type: 'status', message: `Lote ${lote}: enviando foto principal...` });
            try {
              const buf = await downloadImage(mainKey!);
              pieceCookie = await uploadPrincipal(pieceCookie, pieceId, codigoPlatforma, buf);
              mainOk = true;
              principalFinal = true;
            } catch (e) { mainErr = e instanceof Error ? e.message : 'Erro foto'; }
            await send({ type: 'photoProgress', lote, slot: 'main', success: mainOk, error: mainErr || undefined });
          } else {
            await send({ type: 'photoProgress', lote, slot: 'main', success: false, error: `Sem imagem R2: ${ref}` });
          }
        }

        // ── Upload extras nos slots livres (se tiver R2 com extras) ────────
        if (hasR2 && extraKeys.length > 0) {
          await send({ type: 'status', message: `Lote ${lote}: enviando foto(s) extra...` });
          let extrasOk = 0;
          try {
            const { cookie: gc, slots } = await getAvailableSlots(pieceCookie, pieceId);
            pieceCookie = gc;
            if (slots.length > 0) {
              const bufs = await Promise.all(extraKeys.map(k => downloadImage(k)));
              extrasOk   = await uploadExtras(pieceCookie, pieceId, codigoPlatforma, bufs, slots);
            }
          } catch (e) {
            console.error(`[reupload-fotos] Lote ${lote} extras ERRO:`, e instanceof Error ? e.message : e);
          }
          await send({ type: 'photoProgress', lote, slot: 'extra', success: extrasOk > 0, count: extrasOk });
        }

        // ── Ativar ou desativar Site ───────────────────────────────────────
        // Ativa se a peça tem principal (já tinha ou acabou de enviar) e destino permitido.
        // Desativa só se não tem principal E não tem foto no R2 (impossível resolver).
        const deveSite = principalFinal ? (ativarSite ? '1' : null) : (!hasR2 ? '0' : null);
        if (deveSite !== null) {
          const acao = deveSite === '1' ? 'ativar' : 'desativar';
          await send({ type: 'status', message: `Lote ${lote}: ${acao === 'ativar' ? 'ativando' : 'desativando'} Site...` });
          let siteOk = false;
          let siteErr = '';
          try {
            await setSite(pieceCookie, pieceId, codigoPlatforma, lote, deveSite as '0' | '1');
            siteOk = true;
          } catch (e) { siteErr = e instanceof Error ? e.message : 'Erro site'; }
          await send({ type: 'siteProgress', lote, success: siteOk, action: acao, error: siteErr || undefined });
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
