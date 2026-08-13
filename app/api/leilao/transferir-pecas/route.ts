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

// Busca todas as peças do leilão antigo de uma vez (sem filtro) e constrói ref→pieceId.
// Não usa busca por Descricao porque o browser faz via AJAX — o POST direto devolve só o
// shell JS da página sem <td>. O POST sem filtro devolve o HTML server-side renderizado.
async function scrapeRefMap(cookie: string, leilaoOrigem: string, refs: string[]): Promise<Map<string, string>> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      'User-Agent': UA,
      'Referer': `${BASE}/listar_pecas.asp`,
    },
    body: new URLSearchParams({
      Listar: 'on',
      Leilao: leilaoOrigem,
      Botao:  'Pesquisar',
    }).toString(),
    redirect: 'follow',
  });

  const html    = await res.text();
  const tdCount = (html.match(/<td/gi) ?? []).length;
  const tdIdx   = html.indexOf('<td');
  const snippet = tdIdx >= 0 ? html.slice(tdIdx, tdIdx + 400) : html.slice(0, 200);
  console.log(`[transferir] scrapeRefMap leilao=${leilaoOrigem} status=${res.status} len=${html.length} tds=${tdCount} snippet=${snippet.replace(/\s+/g, ' ')}`);

  const map     = new Map<string, string>();
  const refSet  = new Set(refs.map(r => r.toUpperCase()));

  // Cada <tr> que tem <td> é uma linha de peça.
  // O pieceId fica em cells[0] (número puro 6+ dígitos).
  // Procuramos o REF em QUALQUER célula — incluindo Descricao_2 (que armazena apenas o REF)
  // e nas células de descrição (que têm "| REF: XXXX" quando a descrição não está truncada).
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .filter(m => m[1].includes('<td'));

  for (const row of rows) {
    const rowHtml = row[1];
    const cells   = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id      = cells[0]?.trim();
    if (!id || !/^\d{6,}$/.test(id)) continue;

    // Busca o REF em todo o texto da linha (cells + atributos HTML)
    const rowUpper = (cells.slice(1).join(' ') + ' ' + rowHtml).toUpperCase();

    for (const ref of refSet) {
      if (rowUpper.includes(ref)) {
        map.set(ref, id);
        refSet.delete(ref);
        break;
      }
    }

    if (refSet.size === 0) break; // todos encontrados
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
