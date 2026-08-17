export const maxDuration = 300;

const BASE = 'https://www.leiloesbr.com.br/painel_lbr';
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

async function login(user: string, pass: string, numLeilao: string): Promise<string> {
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, {
    headers: { 'User-Agent': UA }, redirect: 'follow',
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

function cleanCell(raw: string): string {
  return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/&amp;/g, '&').trim();
}

// Busca peças com Site desativado (Site=0)
async function listarSiteDesativado(cookie: string, numLeilao: string): Promise<string> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie, 'User-Agent': UA,
      'Origin': 'https://www.leiloesbr.com.br',
      'Referer': `${BASE}/listar_pecas.asp?Listar=on&Leilao=${numLeilao}`,
      'Accept': 'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      Listar: 'on', Leilao: numLeilao,
      Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '', Descricao: '',
      Dia: '', Item: '', IdT: '', Nota: '',
      DtNI: '', DtNF: '', DtSI: '', DtSF: '', DtAI: '', DtAF: '',
      ID_Clil: '', ID_ClIF: '', Extra: '', TaxaL: '',
      Site: '0', Ft: '', Gbl: '', Dv: '', DESTAQUE_O: '',  // Site=0 → só desativadas
      PVendal: '', PVendaF: '', Avall: '', AvalF: '',
      saida: '', order: '', Botao: 'Pesquisar', Tipo: '1',
    }).toString(),
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  return res.text();
}

interface PecaParaAtivar { pieceId: string; lote: number; temPrincipal: boolean; }

// Extrai peças da listagem: pieceId, lote, se tem principal
function parsePecas(html: string): PecaParaAtivar[] {
  const result: PecaParaAtivar[] = [];
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));

  for (const row of rows) {
    const inner = row[1];
    const mainMatch = inner.match(/data-func="subirimgpeca\|(\d+)([^"]*)"/i);
    if (!mainMatch) continue;
    const temPrincipal = mainMatch[2].includes('.jpg');

    const cells = [...inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const pieceId = (cells[0] ?? '').trim();
    if (!/^\d{6,9}$/.test(pieceId)) continue;
    const lote = parseInt(cells[2] ?? '', 10);
    if (!lote || lote > 9999) continue;

    result.push({ pieceId, lote, temPrincipal });
  }
  return result;
}

// Ativa Site da peça via round-trip completo do formulário
async function ativarSite(cookie: string, pieceId: string, codigoPlatforma: string): Promise<void> {
  const getRes = await fetch(`${BASE}/cad_peca.asp?ID=${pieceId}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  const html = await getRes.text();

  const fields = new Map<string, string>();

  for (const m of html.matchAll(/<input[^>]+>/gi)) {
    const tag      = m[0];
    const type     = (tag.match(/type=["']?([^"'\s>]+)/i)?.[1] ?? 'text').toLowerCase();
    if (type === 'submit' || type === 'button' || type === 'image') continue;
    const name     = tag.match(/name=["']([^"']+)["']/i)?.[1];
    if (!name) continue;
    // Checkboxes: só inclui se estiver checked, e o valor é sempre '1' quando marcado
    if (type === 'checkbox') {
      const checked = /\bchecked\b/i.test(tag);
      if (checked) fields.set(name, tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '1');
      // Se não checked, não seta — o POST não envia campos unchecked
      continue;
    }
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '';
    fields.set(name, value);
  }

  for (const m of html.matchAll(/<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)) {
    const name    = m[1];
    const inner   = m[2];
    const selOpt  = inner.match(/<option[^>]+selected[^>]*value=["']([^"']*)["']/i)
                 ?? inner.match(/<option[^>]+value=["']([^"']*)["'][^>]*selected/i);
    const firstOpt = inner.match(/<option[^>]+value=["']([^"']*)["']/i);
    fields.set(name, selOpt?.[1] ?? firstOpt?.[1] ?? '');
  }

  for (const m of html.matchAll(/<textarea[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/textarea>/gi)) {
    fields.set(m[1], m[2]);
  }

  // Checkbox Site: o valor que o browser envia quando marcado depende do atributo value no HTML
  // Se não tem value explícito, browser envia "on". Extraímos o value real do HTML.
  const siteCheckMatch = html.match(/<input[^>]*name=["']?Site["']?[^>]*>/i);
  const siteCheckValue = siteCheckMatch
    ? (siteCheckMatch[0].match(/value=["']([^"']+)["']/i)?.[1] ?? 'on')
    : 'on';
  fields.set('Site',      siteCheckValue);
  fields.set('Botao',     'Gravar');
  fields.set('NumLeilao', codigoPlatforma);
  if (!fields.has('ID')) fields.set('ID', pieceId);

  const params = new URLSearchParams();
  for (const [k, v] of fields) params.append(k, v);

  console.log(`[ativar-site] POST cad_peca.asp pieceId=${pieceId} fields=[${[...fields.keys()].join(',')}] Site=${fields.get('Site')} ID=${fields.get('ID')}`);

  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie, 'User-Agent': UA,
      'Referer': `${BASE}/cad_peca.asp?ID=${pieceId}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: params.toString(), redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  console.log(`[ativar-site] resposta pieceId=${pieceId}: ${text.slice(0, 200)}`);
  if (!text.startsWith('1|')) throw new Error(text.replace(/<[^>]+>/g, '').trim().slice(0, 120));
}

// ─── GET: scan — retorna peças com Site=0 que têm principal ──────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leilao = searchParams.get('leilao')?.trim() ?? '';
  const nome   = searchParams.get('nome')?.trim() ?? '';

  if (!leilao || !nome)
    return Response.json({ error: 'Parâmetros: leilao, nome' }, { status: 400 });

  const creds = getCreds(nome);
  if (!creds)
    return Response.json({ error: 'Sem credenciais para este leilão' }, { status: 400 });

  try {
    const cookie = await login(creds.user, creds.pass, leilao);
    const html   = await listarSiteDesativado(cookie, leilao);
    const todas  = parsePecas(html);

    // Só as que têm principal — essas podem ser ativadas
    const comFoto = todas.filter(p => p.temPrincipal);

    return Response.json({ total: todas.length, comFoto: comFoto.length, pecas: comFoto });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Erro' }, { status: 500 });
  }
}

// ─── POST: ativa Site de uma lista de pieceIds ────────────────────────────────
export async function POST(req: Request) {
  const body = await req.json() as { codigoPlatforma: string; nome: string; pecas: { pieceId: string; lote: number }[] };
  const { codigoPlatforma, nome, pecas } = body;

  if (!codigoPlatforma || !nome || !Array.isArray(pecas) || pecas.length === 0)
    return new Response('Payload inválido', { status: 400 });

  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();
  const enc    = new TextEncoder();
  const send   = async (data: Record<string, unknown>) =>
    writer.write(enc.encode(`data: ${JSON.stringify(data)}\n\n`));

  (async () => {
    try {
      const creds = getCreds(nome);
      if (!creds) { await send({ type: 'error', message: `Sem credenciais para "${nome}"` }); return; }

      await send({ type: 'status', message: 'Autenticando...' });
      const cookie = await login(creds.user, creds.pass, codigoPlatforma);

      await send({ type: 'start', total: pecas.length });

      let ok = 0, errors = 0;
      for (const peca of pecas) {
        await send({ type: 'status', message: `Lote ${peca.lote}: ativando Site...` });
        try {
          await ativarSite(cookie, peca.pieceId, codigoPlatforma);
          ok++;
          await send({ type: 'progress', lote: peca.lote, success: true, done: ok + errors });
        } catch (e) {
          errors++;
          const msg = e instanceof Error ? e.message : 'Erro';
          console.error(`[ativar-site] Lote ${peca.lote}:`, msg);
          await send({ type: 'progress', lote: peca.lote, success: false, error: msg, done: ok + errors });
        }
      }

      await send({ type: 'done', ok, errors });
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
