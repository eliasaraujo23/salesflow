export const maxDuration = 300;

const BASE = 'https://leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const IDC  = '257103';

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

// ─── Parse listing ────────────────────────────────────────────────────────────

function cleanCell(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

// Inspeciona o JS do listar_pecas.asp para encontrar a URL AJAX real de pesquisapeca().
async function findAjaxSearchUrl(cookie: string, leilaoOrigem: string): Promise<string | null> {
  // GET a página SPA para extrair os scripts
  const pageRes = await fetch(`${BASE}/listar_pecas.asp`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/default.asp` },
    redirect: 'follow',
  });
  const pageHtml = await pageRes.text();

  // 1. Procura definição de pesquisapeca() em scripts inline
  const inlineMatches = [...pageHtml.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of inlineMatches) {
    const js = m[1];
    if (!js.includes('pesquisapeca') && !js.includes('listar_peca') && !js.includes('PesquisarPec')) continue;
    // Extrai URL mais próxima de "pesquisapeca" ou de um $.ajax / fetch / $.post
    const urlMatch = js.match(/pesquisapeca[\s\S]{0,200}?["']((?:ajax\/|\.asp)[^"']+)/i)
                  || js.match(/(?:url|href)\s*:\s*["']([^"']*\.asp[^"']*)/gi)?.[0]?.match(/["']([^"']+)/);
    if (urlMatch) {
      console.log(`[transferir] findAjaxUrl inline found: ${urlMatch[1]}`);
      return urlMatch[1];
    }
    // Log dos primeiros 400 chars do script relevante para diagnóstico
    console.log(`[transferir] findAjaxUrl inline script: ${js.slice(0, 400).replace(/\s+/g, ' ')}`);
  }

  // 2. Procura em scripts externos
  const scriptSrcs = [...pageHtml.matchAll(/src=["']([^"']*\.js[^"']*)/gi)].map(m => m[1]);
  for (const src of scriptSrcs) {
    const url  = src.startsWith('http') ? src : `https://leiloesbr.com.br/${src.replace(/^\//, '')}`;
    const sRes = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const js   = await sRes.text();
    if (!js.includes('pesquisapeca') && !js.includes('PesquisarPec')) continue;
    const urlMatch = js.match(/pesquisapeca[\s\S]{0,300}?["']((?:ajax\/|painel_lbr\/)[^"']+)/i);
    if (urlMatch) {
      console.log(`[transferir] findAjaxUrl external (${src}) found: ${urlMatch[1]}`);
      return urlMatch[1];
    }
    console.log(`[transferir] findAjaxUrl external (${src}) pesquisapeca_ctx: ${(js.match(/[\s\S]{0,100}pesquisapeca[\s\S]{0,200}/)?.[0] ?? '').replace(/\s+/g, ' ')}`);
  }

  return null;
}

// Constrói ref→pieceId usando o endpoint AJAX real do listar_pecas.asp.
async function scrapeRefMap(cookie: string, leilaoOrigem: string, refs: string[]): Promise<Map<string, string>> {
  const ajaxUrl = await findAjaxSearchUrl(cookie, leilaoOrigem);
  console.log(`[transferir] ajaxUrl=${ajaxUrl ?? 'NOT_FOUND'}`);

  const map = new Map<string, string>();
  if (!ajaxUrl) return map;

  const fullUrl = ajaxUrl.startsWith('http') ? ajaxUrl : `https://leiloesbr.com.br/painel_lbr/${ajaxUrl.replace(/^\//, '')}`;

  // Tenta buscar todas as peças (sem Descricao) pelo endpoint real
  const res = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Referer':          `${BASE}/listar_pecas.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ Listar: 'on', Leilao: leilaoOrigem, Botao: 'Pesquisar' }).toString(),
    redirect: 'follow',
  });

  const html    = await res.text();
  const tdCount = (html.match(/<td/gi) ?? []).length;
  const snippet = html.slice(0, 200).replace(/\s+/g, ' ');
  console.log(`[transferir] ajaxFetch status=${res.status} len=${html.length} tds=${tdCount} snip=${snippet}`);

  const refSet = new Set(refs.map(r => r.toUpperCase()));
  const rows   = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .filter(m => m[1].includes('<td'));

  for (const row of rows) {
    const rowHtml = row[1];
    const cells   = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id      = cells[0]?.trim();
    if (!id || !/^\d{6,}$/.test(id)) continue;
    const rowUpper = (cells.slice(1).join(' ') + ' ' + rowHtml).toUpperCase();
    for (const ref of refSet) {
      if (rowUpper.includes(ref)) {
        map.set(ref, id);
        refSet.delete(ref);
        break;
      }
    }
    if (refSet.size === 0) break;
  }

  console.log(`[transferir] scrapeRefMap found=${map.size}/${refs.length} missing=${[...refSet].slice(0, 5).join(',')}`);
  return map;
}

// ─── Transfer single piece ────────────────────────────────────────────────────

async function transferPiece(
  cookie:       string,
  idpeca:       string,
  leilaoOrigem: string,
  leilaoDestino: string,
  valor:        number,
  lote:         number,
  dia:          number,
): Promise<void> {
  const res = await fetch(`${BASE}/ajax/exportar_para_leilao.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': UA,
      'Referer': `${BASE}/listar_pecas.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      idpeca,
      nleilao:      leilaoDestino,
      leilaoorigem: leilaoOrigem,
      comitente:    IDC,
      valor:        Math.round(valor).toString(),
      lote:         lote.toString(),
      extra:        '',
      dia:          dia.toString(),
      item:         '',
    }).toString(),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const text = await res.text();
  // leiloesbr returns "1|OK" or "0|mensagem_erro"
  if (text.startsWith('0|')) {
    throw new Error(text.slice(2).replace(/<[^>]+>/g, '').trim().slice(0, 120) || 'Erro no servidor');
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

interface PecaTransferencia {
  ref:   string;
  valor: number;
}

export async function POST(req: Request) {
  const body = await req.json() as {
    nome:          string;
    leilaoOrigem:  string;
    leilaoDestino: string;
    startLote:     number;
    pecas:         PecaTransferencia[];
  };

  const { nome, leilaoOrigem, leilaoDestino, startLote, pecas } = body;
  if (!nome || !leilaoOrigem || !leilaoDestino || !startLote || !Array.isArray(pecas) || pecas.length === 0) {
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

      await send({ type: 'status', message: 'Autenticando...' });
      const cookie = await loginLeiloesbr(creds.user, creds.pass, leilaoOrigem);

      const total = pecas.length;
      await send({ type: 'start', total });

      let done    = 0;
      let success = 0;
      let errors  = 0;

      // ── Fase 1: scraping único da listagem do leilão antigo → ref→pieceId ──────
      await send({ type: 'status', message: `Carregando listagem do leilão N°${leilaoOrigem}...` });
      const refIdMap = await scrapeRefMap(cookie, leilaoOrigem, pecas.map(p => p.ref));

      // ── Fase 2: transferir sequencialmente ───────────────────────────────────
      for (let i = 0; i < pecas.length; i++) {
        const peca     = pecas[i];
        const novoLote = startLote + i;
        const dia      = novoLote <= 200 ? 1 : 2;
        const idpeca   = refIdMap.get(peca.ref.toUpperCase());

        if (!idpeca) {
          done++;
          errors++;
          await send({
            type:    'progress',
            ref:     peca.ref,
            lote:    novoLote,
            done,
            total,
            success: false,
            error:   'Peça não encontrada no leilão de origem',
          });
          continue;
        }

        try {
          await send({ type: 'status', message: `Lote ${novoLote}: transferindo REF ${peca.ref}...` });
          await transferPiece(cookie, idpeca, leilaoOrigem, leilaoDestino, peca.valor, novoLote, dia);
          done++;
          success++;
          await send({ type: 'progress', ref: peca.ref, lote: novoLote, done, total, success: true });
        } catch (err) {
          done++;
          errors++;
          await send({
            type:    'progress',
            ref:     peca.ref,
            lote:    novoLote,
            done,
            total,
            success: false,
            error:   err instanceof Error ? err.message : 'Erro',
          });
        }

        if (i < pecas.length - 1) await new Promise(r => setTimeout(r, 300));
      }

      await send({ type: 'done', success, errors });
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
