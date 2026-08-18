export const maxDuration = 300;

import sharp               from 'sharp';
import { Pool }            from 'pg';
import { getPresignedUrl } from '@/lib/r2';
import { loadPecaFormHtml, extractPecaFields, gravarPeca } from '../_peca-form';

const BASE           = 'https://www.leiloesbr.com.br/painel_lbr';
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

// Colunas: 0=ID(6-9 dígitos), 1=Comitente, 2=Lote(≤9999), 3=Peça, 4=Valor, ...
function parseLoteId(html: string): Map<number, string> {
  const map    = new Map<number, string>();
  const allTds = [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
  for (let i = 0; i + 2 <= allTds.length - 1; i++) {
    const rawId  = allTds[i]?.trim();
    const rawLot = allTds[i + 2]?.replace(/\s/g, '').replace(/\D/g, '');
    if (rawId && /^\d{6,9}$/.test(rawId)) {
      const loteNum = Number(rawLot);
      if (loteNum > 0 && loteNum <= 9999) map.set(loteNum, rawId);
    }
  }
  return map;
}

// listar_pecas.asp retorna o shell SPA (66KB, 0 tds) com body incompleto.
// Precisa de TODOS os campos do form + Tipo=1 + X-Requested-With para retornar a tabela real (~3KB).
async function scrapeListing(cookie: string, numLeilao: string): Promise<Map<number, string>> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `${BASE}/listar_pecas.asp?Listar=on&Leilao=${numLeilao}`,
      'Accept':           'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      Listar: 'on', Leilao: numLeilao,
      Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '',
      Descricao: '',
      Dia: '', Item: '', IdT: '', Nota: '',
      DtNI: '', DtNF: '', DtSI: '', DtSF: '', DtAI: '', DtAF: '',
      ID_Clil: '', ID_ClIF: '', Extra: '', TaxaL: '',
      Site: '', Ft: '', Gbl: '', Dv: '', DESTAQUE_O: '',
      PVendal: '', PVendaF: '', Avall: '', AvalF: '',
      saida: '', order: '',
      Botao: 'Pesquisar',
      Tipo: '1',
    }).toString(),
    redirect: 'follow',
  });
  const html = await res.text();
  return parseLoteId(html);
}

// ─── DB: image keys ───────────────────────────────────────────────────────────

interface ImageKeys {
  principal: string | null;
  extras:    string[];
}

function isVideo(key: string): boolean {
  return /\.(mov|mp4|avi|webm)$/i.test(key);
}

async function queryImageKeys(refs: string[]): Promise<Map<string, ImageKeys>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      referencia:   string;
      key:          string;
      is_main:      boolean;
      is_secondary: boolean;
    }>(
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
      const images  = (grouped.get(ref) ?? []).filter(i => !isVideo(i.key));
      const main    = images.find(i => i.is_main);
      const principal = main?.key ?? images[0]?.key ?? null;
      // Todas as demais fotos como extras (sem duplicar a principal), máx 5
      const extras  = images.map(i => i.key).filter(k => k !== principal).slice(0, 5);
      map.set(ref, { principal, extras });
    }
    return map;
  } finally {
    client.release();
  }
}

// ─── Photo upload ─────────────────────────────────────────────────────────────

async function processImage(buf: ArrayBuffer): Promise<Buffer> {
  const maxBytes = 1.8 * 1024 * 1024;
  const pipeline = sharp(Buffer.from(buf)).rotate().resize({
    width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true,
  });
  let quality = 90;
  let out: Buffer;
  do {
    if (quality < 20) throw new Error('Não foi possível comprimir a imagem para o tamanho desejado.');
    out = await pipeline.clone().jpeg({ quality, progressive: true, mozjpeg: true }).toBuffer();
    quality -= 10;
  } while (out.byteLength > maxBytes);
  return out;
}

// Tenta white-images primeiro, cai para leilao se não existir
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

// Carrega a página de upload de fotos — estabelece sessão PHP (subir_pecas.asp, igual ao browser)
async function loadUploadPage(cookie: string, pieceId: string): Promise<string> {
  const res = await fetch(`${BASE}/subir_pecas.asp?Id=${pieceId}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow',
  });
  return mergeCookies(cookie, res);
}

// Lê gerenciar_imagens.asp, extrai quais slots (_1.._5) já estão ocupados,
// e retorna os slots livres (ex: [1,2,3,4,5] para peça sem extras).
// O JS do Bootstrap FileInput usa exatamente essa lógica (doneArr) para o compl de cada arquivo.
async function getAvailableSlots(cookie: string, pieceId: string): Promise<{ cookie: string; slots: number[] }> {
  const res = await fetch(`${BASE}/gerenciar_imagens.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie, 'User-Agent': UA,
      'Referer': `${BASE}/listar_pecas.asp`,
    },
    body: new URLSearchParams({ ID: pieceId }).toString(),
    redirect: 'follow',
  });
  const text = await res.text();
  const updatedCookie = mergeCookies(cookie, res);

  // Extrai captions dos extras já existentes (ex: "32139884_2.jpg" → slot 2)
  const occupied = new Set<number>();
  for (const m of text.matchAll(/initialPreview(?:Config)?\s*:\s*\[([^\]]*)\]/g)) {
    for (const cap of m[1].matchAll(/"caption"\s*:\s*"[^"]*_(\d+)\.jpg"/g)) {
      const n = parseInt(cap[1]);
      if (n >= 1 && n <= 5) occupied.add(n);
    }
  }

  // Slots livres de 1 a 5, em ordem — igual ao doneArr do JS
  const slots: number[] = [];
  for (let i = 1; i <= 5; i++) {
    if (!occupied.has(i)) slots.push(i);
  }

  console.log(`[upload-fotos] extras pieceId=${pieceId} slots ocupados=[${[...occupied]}] livres=[${slots}]`);
  return { cookie: updatedCookie, slots };
}


// Upload da imagem principal via img_pecas.php + s3enviaimagem.asp
// Retorna cookie atualizado (incluindo PHPSESSID do servidor PHP)
async function uploadPrincipal(
  cookie:    string,
  pieceId:   string,
  numLeilao: string,
  buf:       Buffer,
): Promise<string> {
  const fd = new FormData();
  fd.append('IdPeca',    pieceId);
  fd.append('NumLeilao', numLeilao);
  fd.append('Siteurl',   'https://www.leiloesbr.com.br/');
  fd.append('Foto', new Blob([buf as unknown as BlobPart], { type: 'image/jpeg' }), 'photo.jpg');

  console.log(`[upload-fotos] principal POST img_pecas.php pieceId=${pieceId} size=${buf.byteLength}`);
  const res = await fetch(`${BASE}/img_pecas.php`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
    body: fd,
    redirect: 'follow',
    signal: AbortSignal.timeout(60_000),
  });
  const updatedCookie = mergeCookies(cookie, res);

  const text = await res.text();
  console.log(`[upload-fotos] principal resp status=${res.status}: ${text.slice(0, 120)}`);
  if (!res.ok) throw new Error(`principal HTTP ${res.status}: ${text.slice(0, 100)}`);

  return updatedCookie;
}

// Upload extras via img_pecas_extras.php, um POST por arquivo.
// compl = número do slot livre (1..5), calculado pelo getAvailableSlots — replica
// exatamente o uploadExtraData do Bootstrap FileInput (variável doneArr no JS do servidor).
async function uploadExtras(
  cookie:      string,
  pieceId:     string,
  numLeilao:   string,
  buffers:     Buffer[],
  freeSlots:   number[],
): Promise<number> {
  if (buffers.length === 0) return 0;

  const count = Math.min(buffers.length, freeSlots.length);
  let activeCookie = cookie;
  let ok = 0;

  for (let i = 0; i < count; i++) {
    const slot = freeSlots[i]; // slot livre: 1, 2, 3, 4 ou 5
    const fd = new FormData();
    fd.append('Foto',      new Blob([buffers[i] as unknown as BlobPart], { type: 'image/jpeg' }), `extra_${i}.jpg`);
    fd.append('file_id',   String(i));
    fd.append('compl',     String(slot)); // compl = número do slot, não total de arquivos
    fd.append('IdPeca',    pieceId);
    fd.append('NumLeilao', numLeilao);
    fd.append('Siteurl',   'https://www.leiloesbr.com.br/');

    console.log(`[upload-fotos] extra[${i + 1}/${count}] file_id=${i} compl=${slot} pieceId=${pieceId}`);
    const res = await fetch(`${BASE}/img_pecas_extras.php`, {
      method:  'POST',
      headers: { 'Cookie': activeCookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
      body:    fd,
      redirect: 'follow',
      signal:  AbortSignal.timeout(60_000),
    });
    activeCookie = mergeCookies(activeCookie, res);
    const text = await res.text();
    console.log(`[upload-fotos] extra[${i + 1}/${count}] slot=${slot} status=${res.status}`);
    if (res.ok && !text.includes('"error"')) ok++;

    if (i < count - 1) await new Promise(r => setTimeout(r, 300));
  }
  return ok;
}

// ─── Activate Site ────────────────────────────────────────────────────────────

async function activateSite(cookie: string, pieceId: string, codigoPlatforma: string): Promise<void> {
  const html   = await loadPecaFormHtml(cookie, pieceId);
  const fields = extractPecaFields(html);

  console.log(`[upload-fotos] activateSite tipo=3 pieceId=${pieceId} campos=[${[...fields.keys()].join(',')}]`);

  if (fields.size < 3) {
    throw new Error(`Formulário não carregou (${fields.size} campos). Resp: ${html.slice(0, 150)}`);
  }

  fields.set('ID',        fields.get('ID') || pieceId);
  fields.set('NumLeilao', codigoPlatforma);
  fields.set('Site',      '1');
  fields.set('Botao',     'Gravar');

  const text = await gravarPeca(cookie, fields);
  console.log(`[upload-fotos] activateSite resposta pieceId=${pieceId}: ${text.slice(0, 120)}`);
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
  ativarSite?:       boolean; // false = destino excluído; default true
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
        const pieceId  = loteIdMap.get(peca.lote)!;
        const imgKeys  = imageMap.get(peca.referencia);
        const mainKey  = imgKeys?.principal ?? null;
        const extraKeys = imgKeys?.extras ?? []; // já filtrado no queryImageKeys

        // Carregar página de edição — captura PHPSESSID junto com ASPSESSIONID
        let pieceCookie = cookie;
        try { pieceCookie = await loadUploadPage(cookie, pieceId); } catch { /* non-fatal */ }

        // Upload principal usando key_principal do banco
        let mainOk = false;
        let mainErr = '';
        if (mainKey) {
          await send({ type: 'status', message: `Lote ${peca.lote}: comprimindo foto principal...` });
          try {
            const buf = await downloadImage(mainKey);
            await send({ type: 'status', message: `Lote ${peca.lote}: enviando foto principal...` });
            pieceCookie = await uploadPrincipal(pieceCookie, pieceId, codigoPlatforma, buf);
            mainOk = true;
          } catch (e) { mainErr = e instanceof Error ? e.message : 'Erro foto'; }
        } else {
          mainErr = `key_principal ausente: ${peca.referencia}`;
        }
        await send({ type: 'photoProgress', lote: peca.lote, slot: 'main', success: mainOk, error: mainErr || undefined });

        // Upload extras usando key_extra_1..5 do banco
        let extrasOk = 0;
        if (extraKeys.length > 0) {
          await send({ type: 'status', message: `Lote ${peca.lote}: enviando ${extraKeys.length} foto(s) extra...` });
          try {
            // Consulta slots livres (_1.._5) — replica o doneArr do JS do servidor
            const { cookie: gc, slots } = await getAvailableSlots(pieceCookie, pieceId);
            pieceCookie = gc;
            const bufs = await Promise.all(extraKeys.map(k => downloadImage(k)));
            extrasOk = await uploadExtras(pieceCookie, pieceId, codigoPlatforma, bufs, slots);
          } catch (e) {
            console.error(`[upload-fotos] Lote ${peca.lote} extras ERRO:`, e instanceof Error ? e.message : e);
          }
          await send({ type: 'photoProgress', lote: peca.lote, slot: 'extra', success: extrasOk > 0, count: extrasOk });
        }

        // Ativar Site após foto(s) — só se destino não estiver excluído
        if ((peca.ativarSite ?? true) && mainOk) {
          await send({ type: 'status', message: `Lote ${peca.lote}: ativando Site...` });
          let siteOk = false;
          let siteErr = '';
          try {
            await activateSite(pieceCookie, pieceId, codigoPlatforma);
            siteOk = true;
          } catch (e) { siteErr = e instanceof Error ? e.message : 'Erro site'; }
          await send({ type: 'siteProgress', lote: peca.lote, success: siteOk, error: siteErr || undefined });
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
