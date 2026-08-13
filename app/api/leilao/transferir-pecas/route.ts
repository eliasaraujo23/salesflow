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

// Returns map of ref (uppercase) → pieceId (leiloesbr internal ID)
async function scrapeListingRefs(cookie: string, leilaoOrigem: string): Promise<Map<string, string>> {
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
      Botao: 'Pesquisar',
      Tipo: '1',
    }).toString(),
    redirect: 'follow',
  });

  const html = await res.text();
  const map  = new Map<string, string>();

  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .filter(m => m[1].includes('<td'));

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id    = cells[0]?.trim();
    const desc  = cells[3]?.trim() ?? '';
    if (!id || !/^\d+$/.test(id)) continue;
    // Description format: "ANEL ... | REF: I15004"
    const refMatch = desc.match(/REF:\s*([A-Z0-9\-_]+)/i);
    if (refMatch) {
      map.set(refMatch[1].toUpperCase(), id);
    }
  }

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

      await send({ type: 'status', message: `Buscando peças do leilão N°${leilaoOrigem}...` });
      const refMap = await scrapeListingRefs(cookie, leilaoOrigem);

      const total = pecas.length;
      await send({ type: 'start', total });

      let done    = 0;
      let success = 0;
      let errors  = 0;

      for (let i = 0; i < pecas.length; i++) {
        const peca     = pecas[i];
        const novoLote = startLote + i;
        const dia      = novoLote <= 200 ? 1 : 2;
        const idpeca   = refMap.get(peca.ref.toUpperCase());

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

        // Small delay to avoid overwhelming the server
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
