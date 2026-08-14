export const maxDuration = 300;

const BASE = 'https://leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

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

function cleanCell(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}

interface PecaRow {
  idpeca: string;
  lote:   number;
  ref:    string;
  // funções disponíveis no HTML (para debug)
  funcs:  string[];
}

async function listarPecas(cookie: string, leilao: string): Promise<PecaRow[]> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `https://www.leiloesbr.com.br/painel_lbr/listar_pecas.asp?Listar=on&Leilao=${leilao}`,
      'Accept':           'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      Listar: 'on', Leilao: leilao,
      Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '',
      Descricao: '', Dia: '', Item: '', IdT: '', Nota: '',
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
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));
  const pecas: PecaRow[] = [];

  for (const row of rows) {
    const rowHtml = row[0];
    const cells   = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const idpeca  = cells[0]?.trim();
    if (!idpeca || !/^\d{6,9}$/.test(idpeca)) continue;

    const loteNum = Number(cells[2]?.replace(/\D/g, ''));
    if (!loteNum) continue;

    // Ref está em alguma célula de texto — procura padrão 6-8 dígitos não sendo o ID nem o lote
    let ref = '';
    for (let i = 1; i < cells.length; i++) {
      const c = cells[i].trim();
      // REF: 6-8 dígitos numéricos, diferente do idpeca
      if (/^\d{6,8}$/.test(c) && c !== idpeca) { ref = c; break; }
    }
    if (!ref) {
      // tenta extrair da coluna de descrição — REF costuma ser o primeiro token numérico
      const desc = cells.find((c, i) => i > 0 && c.length > 4 && !/^\d+$/.test(c)) ?? '';
      const m = desc.match(/\b(\d{6,8})\b/);
      if (m) ref = m[1];
    }

    // Captura todos os data-func da linha para inspeção
    const funcs = [...rowHtml.matchAll(/data-func=["']([^"']+)/gi)].map(m => m[1]);

    if (ref) pecas.push({ idpeca, lote: loteNum, ref, funcs });
  }

  return pecas;
}

async function excluirPeca(cookie: string, idpeca: string, leilao: string): Promise<void> {
  // O leiloes.br usa esta URL para excluir via AJAX (confirmado pelo padrão data-func="excluipeca(ID)")
  const res = await fetch(`${BASE}/ajax/excluipeca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `${BASE}/listar_pecas.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ idpeca, nleilao: leilao }).toString(),
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  // Resposta esperada: "1" ou "1|OK" em caso de sucesso
  if (text.trim().startsWith('0')) {
    const msg = text.slice(2).replace(/<[^>]+>/g, '').trim();
    throw new Error(msg || 'Servidor retornou erro');
  }
}

// ─── GET: escanear duplicatas sem remover ─────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leilao = searchParams.get('leilao') ?? '';
  const nome   = searchParams.get('nome')   ?? '';

  if (!leilao || !nome) return Response.json({ error: 'leilao e nome obrigatórios' }, { status: 400 });

  const creds = getCreds(nome);
  if (!creds) return Response.json({ error: `Sem credenciais para "${nome}"` }, { status: 400 });

  const cookie = await loginLeiloesbr(creds.user, creds.pass, leilao);
  const pecas  = await listarPecas(cookie, leilao);

  // Agrupa por REF
  const byRef = new Map<string, PecaRow[]>();
  for (const p of pecas) {
    const arr = byRef.get(p.ref) ?? [];
    arr.push(p);
    byRef.set(p.ref, arr);
  }

  const duplicatas = [...byRef.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([ref, rows]) => ({
      ref,
      ocorrencias: rows.sort((a, b) => a.lote - b.lote),
      // primeira linha: funcs disponíveis (para debug do endpoint de exclusão)
      funcsAmostra: rows[0].funcs,
    }));

  return Response.json({
    totalPecas:      pecas.length,
    totalDuplicatas: duplicatas.reduce((acc, d) => acc + d.ocorrencias.length - 1, 0),
    duplicatas,
  });
}

// ─── POST: remover duplicatas via SSE ─────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.json() as { nome: string; leilao: string };
  const { nome, leilao } = body;

  if (!nome || !leilao) return new Response('Payload inválido', { status: 400 });

  const creds = getCreds(nome);
  if (!creds) return new Response(`Sem credenciais para "${nome}"`, { status: 400 });

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const enc    = new TextEncoder();

  const send = async (data: Record<string, unknown>) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  (async () => {
    try {
      await send({ type: 'status', message: 'Autenticando...' });
      const cookie = await loginLeiloesbr(creds.user, creds.pass, leilao);

      await send({ type: 'status', message: 'Listando peças do leilão...' });
      const pecas = await listarPecas(cookie, leilao);
      console.log(`[remover-duplicatas] leilao=${leilao} totalPecas=${pecas.length} amostra=${JSON.stringify(pecas.slice(0,3))}`);

      // Agrupa por REF, mantém a de menor lote, marca o resto para exclusão
      const byRef = new Map<string, PecaRow[]>();
      for (const p of pecas) {
        const arr = byRef.get(p.ref) ?? [];
        arr.push(p);
        byRef.set(p.ref, arr);
      }

      const paraExcluir: PecaRow[] = [];
      for (const rows of byRef.values()) {
        if (rows.length <= 1) continue;
        rows.sort((a, b) => a.lote - b.lote);
        paraExcluir.push(...rows.slice(1)); // mantém o primeiro (menor lote), exclui os demais
      }

      if (paraExcluir.length === 0) {
        await send({ type: 'done', removed: 0, errors: 0, message: 'Nenhuma duplicata encontrada.' });
        return;
      }

      await send({ type: 'start', total: paraExcluir.length });

      let done    = 0;
      let success = 0;
      let errors  = 0;

      for (const p of paraExcluir) {
        try {
          await send({ type: 'status', message: `Removendo lote ${p.lote} REF ${p.ref}...` });
          await excluirPeca(cookie, p.idpeca, leilao);
          done++; success++;
          await send({ type: 'progress', done, total: paraExcluir.length, ref: p.ref, lote: p.lote, success: true });
        } catch (err) {
          done++; errors++;
          await send({
            type: 'progress', done, total: paraExcluir.length,
            ref: p.ref, lote: p.lote, success: false,
            error: err instanceof Error ? err.message : 'Erro',
          });
        }
        if (done < paraExcluir.length) await new Promise(r => setTimeout(r, 300));
      }

      await send({ type: 'done', removed: success, errors });
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
