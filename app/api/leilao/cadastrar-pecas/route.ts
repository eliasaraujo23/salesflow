export const maxDuration = 300;

const BASE       = 'https://leiloesbr.com.br/painel_lbr';
const UA         = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const IDC        = '257103'; // Comitente Goldtech Joias (ETERNNO e BARAUJO)
const ID_TIPO_JOIAS = '18';

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

// ─── Price formatting ─────────────────────────────────────────────────────────

function formatBRPrice(price: number): string {
  return Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ─── Create a single piece ───────────────────────────────────────────────────

async function createPiece(
  cookie:          string,
  peca:            PecaInput,
  codigoPlatforma: string,
): Promise<void> {
  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      'User-Agent': UA,
      'Referer': `${BASE}/cad_peca.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      ID:               '',
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
      Site:             '0',
      Destaque:         '',
      dtVenda:          '',
      oldCartela:       '',
      Botao:            'Gravar Novo',
    }).toString(),
    redirect: 'follow',
  });

  const text = await res.text();
  if (!text.startsWith('1|')) {
    throw new Error(text.replace(/<[^>]+>/g, '').trim().slice(0, 120));
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

interface PecaInput {
  lote:              number;
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
    pecas:           PecaInput[];
    doneOffset?:     number;
    totalGlobal?:    number;
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

      await send({ type: 'status', message: 'Autenticando...' });
      const cookie = await loginLeiloesbr(creds.user, creds.pass, codigoPlatforma);

      const total      = pecas.length;
      const doneOffset = body.doneOffset ?? 0;
      await send({ type: 'start', total, doneOffset });

      let localDone    = 0;
      let successCount = 0;
      let errorCount   = 0;

      const CONCURRENCY = 3;
      const queue = [...pecas];

      async function worker() {
        while (true) {
          const peca = queue.shift();
          if (!peca) break;

          try {
            await createPiece(cookie, peca, codigoPlatforma);
            const snap = ++localDone; successCount++;
            await send({ type: 'progress', lote: peca.lote, done: doneOffset + snap, total, success: true });
          } catch (err) {
            const snap = ++localDone; errorCount++;
            await send({
              type: 'progress',
              lote: peca.lote,
              done: doneOffset + snap,
              total,
              success: false,
              error: err instanceof Error ? err.message : 'Erro',
            });
          }
        }
      }

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      await send({ type: 'done', success: successCount, errors: errorCount });
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
