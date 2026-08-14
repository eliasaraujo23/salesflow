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

// O listar_pecas.asp retorna o shell SPA (66KB, 0 tds) com body incompleto.
// Quando o body tem TODOS os campos do form (conforme DevTools), o servidor detecta
// que é uma requisição AJAX e devolve só a tabela (~3KB com os dados reais).
function buildListingBody(leilaoOrigem: string, descricao = ''): string {
  return new URLSearchParams({
    Listar: 'on', Leilao: leilaoOrigem,
    Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '',
    Descricao: descricao,
    Dia: '', Item: '', IdT: '', Nota: '',
    DtNI: '', DtNF: '', DtSI: '', DtSF: '', DtAI: '', DtAF: '',
    ID_Clil: '', ID_ClIF: '', Extra: '', TaxaL: '',
    Site: '', Ft: '', Gbl: '', Dv: '', DESTAQUE_O: '',
    PVendal: '', PVendaF: '', Avall: '', AvalF: '',
    saida: '', order: '',
    Botao: 'Pesquisar',
    Tipo: '1',
  }).toString();
}

async function ajaxListar(cookie: string, leilaoOrigem: string, descricao = ''): Promise<string> {
  const res = await fetch('https://www.leiloesbr.com.br/painel_lbr/listar_pecas.asp', {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `https://www.leiloesbr.com.br/painel_lbr/listar_pecas.asp?Listar=on&Leilao=${leilaoOrigem}`,
      'Accept':           'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: buildListingBody(leilaoOrigem, descricao),
    redirect: 'follow',
  });
  return res.text();
}

function extractPieceId(html: string): string | null {
  const exportMatch = html.match(/data-func=["']exportapeca\((\d+)/i);
  if (exportMatch) return exportMatch[1];
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id = cells[0]?.trim();
    if (id && /^\d{6,}$/.test(id)) return id;
  }
  return null;
}

// Fase 1: busca todos os IDs em uma chamada (sem Descricao = todas as peças do leilão).
// Se algum ref ficar faltando, faz buscas individuais por Descricao.
async function scrapeRefMap(cookie: string, leilaoOrigem: string, refs: string[]): Promise<Map<string, string>> {
  const map    = new Map<string, string>();
  const refSet = new Set(refs.map(r => r.toUpperCase()));

  // Tentativa 1: todas as peças de uma vez
  const allHtml = await ajaxListar(cookie, leilaoOrigem);
  const tdCount = (allHtml.match(/<td/gi) ?? []).length;
  console.log(`[transferir] scrapeAll leilao=${leilaoOrigem} len=${allHtml.length} tds=${tdCount} snip=${allHtml.slice(0, 100).replace(/\s+/g, ' ')}`);

  const rows = [...allHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));
  for (const row of rows) {
    const rowHtml  = row[1];
    const cells    = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id       = cells[0]?.trim();
    if (!id || !/^\d{6,}$/.test(id)) continue;
    const rowUpper = (cells.slice(1).join(' ') + ' ' + rowHtml).toUpperCase();
    for (const ref of refSet) {
      if (rowUpper.includes(ref)) { map.set(ref, id); refSet.delete(ref); break; }
    }
    if (refSet.size === 0) break;
  }

  // Tentativa 2: refs ainda faltando → busca individual por Descricao
  if (refSet.size > 0) {
    console.log(`[transferir] individual lookup for ${refSet.size} missing: ${[...refSet].slice(0,5).join(',')}`);
    const queue   = [...refSet];
    const workers = Array.from({ length: 5 }, async () => {
      while (queue.length > 0) {
        const ref = queue.shift()!;
        const html = await ajaxListar(cookie, leilaoOrigem, ref);
        const id   = extractPieceId(html);
        console.log(`[transferir] individual ref=${ref} tds=${(html.match(/<td/gi)??[]).length} found=${id??'NULL'}`);
        if (id) map.set(ref, id);
      }
    });
    await Promise.all(workers);
  }

  console.log(`[transferir] scrapeRefMap final found=${map.size}/${refs.length}`);
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
  // leiloesbr returns "1|OK", "0|Lote incluído" (sucesso) or "0|Erro: ..." (falha)
  if (text.startsWith('0|')) {
    const msg = text.slice(2).replace(/<[^>]+>/g, '').trim();
    // "Lote incluído" usa prefixo 0 mas é sucesso
    if (/inclu/i.test(msg)) return;
    throw new Error(msg.slice(0, 120) || 'Erro no servidor');
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
    doneOffset?:   number;
    totalGlobal?:  number;
    pecas:         PecaTransferencia[];
  };

  const { nome, leilaoOrigem, leilaoDestino, startLote, totalGlobal, pecas } = body;
  if (!nome || !leilaoOrigem || !leilaoDestino || !startLote || !Array.isArray(pecas) || pecas.length === 0) {
    return new Response('Payload inválido', { status: 400 });
  }

  // totalGlobal é enviado pelo hook quando usa chunking — permite calcular progresso global
  const reportTotal = totalGlobal ?? pecas.length;

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

      await send({ type: 'start', total: reportTotal });

      let chunkDone = 0;
      let success   = 0;
      let errors    = 0;

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
          chunkDone++;
          errors++;
          await send({
            type:    'progress',
            ref:     peca.ref,
            lote:    novoLote,
            done:    chunkDone,
            total:   reportTotal,
            success: false,
            error:   'Peça não encontrada no leilão de origem',
          });
          continue;
        }

        try {
          await send({ type: 'status', message: `Lote ${novoLote}: transferindo REF ${peca.ref}...` });
          await transferPiece(cookie, idpeca, leilaoOrigem, leilaoDestino, peca.valor, novoLote, dia);
          chunkDone++;
          success++;
          await send({ type: 'progress', ref: peca.ref, lote: novoLote, done: chunkDone, total: reportTotal, success: true });
        } catch (err) {
          chunkDone++;
          errors++;
          await send({
            type:    'progress',
            ref:     peca.ref,
            lote:    novoLote,
            done:    chunkDone,
            total:   reportTotal,
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
