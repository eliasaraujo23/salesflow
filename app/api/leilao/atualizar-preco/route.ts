const BASE = 'https://leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ─── Credentials ────────────────────────────────────────────────────────────

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

// ─── HTTP helpers ────────────────────────────────────────────────────────────

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

async function downloadExport(cookie: string, numLeilao: string): Promise<string> {
  const res = await fetch(`${BASE}/ajax/exportalotes.asp?Leilao=${numLeilao}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Export falhou: HTTP ${res.status}`);
  return res.text();
}

async function scrapeListing(cookie: string, numLeilao: string): Promise<string> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      'User-Agent': UA,
      'Referer': `${BASE}/listar_pecas.asp`,
    },
    body: new URLSearchParams({ Listar: 'on', Leilao: numLeilao, Botao: 'Pesquisar', Tipo: '1' }).toString(),
    redirect: 'follow',
  });
  return res.text();
}

// ─── HTML parsers ────────────────────────────────────────────────────────────

function cleanCell(raw: string): string {
  return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
}

/** Export HTML: extrai mapa Lote → REF */
function parseLoteRef(html: string): Map<string, string> {
  // HTML malformado: só a 1ª linha tem <tr> de abertura — divide pelo fechamento
  const segments = html.split(/<\/tr>/i);
  const headerSeg = segments[0] ?? '';
  const headers = [...headerSeg.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
    .map(m => cleanCell(m[1]));

  const idxLote = headers.findIndex(h => /^lote$/i.test(h));
  const idxMini = headers.findIndex(h => /minidesc|mini/i.test(h));
  if (idxLote < 0 || idxMini < 0) return new Map();

  const result = new Map<string, string>();
  for (const seg of segments.slice(1)) {
    const cells = [...seg.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    if (cells.length === 0) continue;
    const lote = cells[idxLote];
    const ref  = cells[idxMini].toUpperCase();
    if (lote && ref) result.set(lote, ref);
  }
  return result;
}

/** Listing HTML: extrai mapa Lote → ID interno */
function parseLoteId(html: string): Map<string, string> {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .filter(m => m[1].includes('<td'));

  const result = new Map<string, string>();
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id   = cells[0]?.trim();
    const lote = cells[2]?.trim();
    if (id && lote && /^\d+$/.test(id)) result.set(lote, id);
  }
  return result;
}

/** Formulário cad_peca.asp: extrai todos os campos */
function parseForm(html: string): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const m of html.matchAll(/<input([^>]*)>/gi)) {
    const attrs = m[1];
    const name  = attrs.match(/name="([^"]+)"/i)?.[1];
    const value = attrs.match(/value="([^"]*)"/i)?.[1] ?? '';
    const type  = (attrs.match(/type="([^"]+)"/i)?.[1] ?? 'text').toLowerCase();
    if (!name || type === 'submit' || type === 'button') continue;
    if (type === 'checkbox') {
      if (/checked/i.test(attrs)) fields[name] = value || '1';
    } else {
      fields[name] = value;
    }
  }

  for (const m of html.matchAll(/<select[^>]+name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
    const name = m[1];
    const body = m[2];
    const sel  = body.match(/<option[^>]+selected[^>]*value="([^"]*)"/i)
              ?? body.match(/<option[^>]+value="([^"]*)"/i);
    fields[name] = sel?.[1] ?? '';
  }

  for (const m of html.matchAll(/<textarea[^>]+name="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/gi)) {
    fields[m[1]] = m[2].trim();
  }

  return fields;
}

// ─── Price formatting ─────────────────────────────────────────────────────────

/** Formata preço como a plataforma espera: 17790 → "17.790", 1790 → "1.790" */
function formatBRPrice(price: number): string {
  return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ─── Update a single piece ───────────────────────────────────────────────────

async function updatePiece(cookie: string, id: string, novoPreco: number, numLeilao: string): Promise<void> {
  const hdrs = (referer: string) => ({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': cookie,
    'User-Agent': UA,
    'Referer': referer,
  });

  // 1. Load form
  const formRes = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: hdrs(`${BASE}/listar_pecas.asp`),
    body: new URLSearchParams({ tipo: '3', ID: id }).toString(),
    redirect: 'follow',
  });
  const formHtml = await formRes.text();
  const fields = parseForm(formHtml);

  // 2. Check step (aceita o lote para edição)
  await fetch(`${BASE}/chk_item_peca.asp`, {
    method: 'POST',
    headers: hdrs(`${BASE}/cad_peca.asp`),
    body: new URLSearchParams({
      Item: fields['Item'] ?? '1',
      V:    '1',
      NL:   fields['NumLeilao'] ?? numLeilao,
      IdC:  fields['ID_Cliente'] ?? '',
      ID:   id,
      tipo: '3',
    }).toString(),
    redirect: 'follow',
  });

  // 3. Save with new price — ID explícito para garantir update (não create)
  const saveRes = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: hdrs(`${BASE}/cad_peca.asp`),
    body: new URLSearchParams({
      ...fields,
      ID:               id,
      Valor_Contratado: formatBRPrice(novoPreco),
      Botao: 'Gravar',
      tipo:  '3',
    }).toString(),
    redirect: 'follow',
  });
  const saveText = await saveRes.text();

  if (!saveText.startsWith('1|')) {
    throw new Error(saveText.replace(/<[^>]+>/g, '').trim().slice(0, 120));
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

interface PecaInput {
  ref:      string;
  novoPreco: number;
}

export async function POST(req: Request) {
  const body = await req.json() as {
    codigoPlatforma: string;
    nome:            string;
    pecas:           PecaInput[];
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
        await send({ type: 'error', message: `Sem credenciais para o leilão "${nome}"` });
        return;
      }

      await send({ type: 'mapping', message: 'Autenticando...' });
      const cookie = await loginLeiloesbr(creds.user, creds.pass, codigoPlatforma);

      await send({ type: 'mapping', message: 'Baixando catálogo...' });
      const [exportHtml, listHtml] = await Promise.all([
        downloadExport(cookie, codigoPlatforma),
        scrapeListing(cookie, codigoPlatforma),
      ]);

      const loteToRef = parseLoteRef(exportHtml);
      const loteToId  = parseLoteId(listHtml);

      const refToId = new Map<string, string>();
      for (const [lote, ref] of loteToRef) {
        const id = loteToId.get(lote);
        if (id) refToId.set(ref.toUpperCase(), id);
      }

      const total = pecas.length;
      await send({ type: 'start', total });

      let done = 0;
      let successCount = 0;
      let errorCount   = 0;

      for (const peca of pecas) {
        const id = refToId.get(peca.ref.toUpperCase());
        if (!id) {
          done++;
          errorCount++;
          await send({ type: 'progress', ref: peca.ref, done, total, success: false, error: 'Não encontrada no catálogo' });
          continue;
        }

        try {
          await updatePiece(cookie, id, peca.novoPreco, codigoPlatforma);
          done++;
          successCount++;
          await send({ type: 'progress', ref: peca.ref, done, total, success: true });
        } catch (err) {
          done++;
          errorCount++;
          await send({ type: 'progress', ref: peca.ref, done, total, success: false, error: err instanceof Error ? err.message : 'Erro' });
        }
      }

      await send({ type: 'done', success: successCount, errors: errorCount });
    } catch (err) {
      await send({ type: 'error', message: err instanceof Error ? err.message : 'Erro interno' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
