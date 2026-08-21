export const maxDuration = 60;

const BASE = 'https://leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function getCreds(nome: string): { user: string; pass: string; numLeilao: string } | null {
  const n = nome.toUpperCase();
  if (n.startsWith('ETERNNO')) {
    const user      = process.env.LEILOESBR_USER_ETERNNO;
    const pass      = process.env.LEILOESBR_PASS_ETERNNO;
    const numLeilao = process.env.LEILOESBR_NUM_ETERNNO;
    return user && pass && numLeilao ? { user, pass, numLeilao } : null;
  }
  if (n.startsWith('BRUNO')) {
    const user      = process.env.LEILOESBR_USER_BARAUJO;
    const pass      = process.env.LEILOESBR_PASS_BARAUJO;
    const numLeilao = process.env.LEILOESBR_NUM_BARAUJO;
    return user && pass && numLeilao ? { user, pass, numLeilao } : null;
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
      'Cookie':        sessionId,
      'Referer':       `${BASE}/default.asp?Log=off`,
      'User-Agent':    UA,
    },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });

  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

function cleanCell(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}

// Busca idpeca no listar_pecas.asp filtrando pelo número do lote (mais preciso que busca por texto).
async function findIdpecaByLote(cookie: string, leilao: string, lote: number): Promise<string | null> {
  const loteStr = String(lote);
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
      Peca: '', Lotel: loteStr, LoteF: loteStr, Cartela: '', Cart: '',
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

  console.log(`[excluir-peca] listar_pecas lote=${lote} rows=${rows.length}`);

  for (const row of rows) {
    const cells  = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const idpeca = cells[0]?.trim();
    if (idpeca && /^\d{6,9}$/.test(idpeca)) return idpeca;
  }
  return null;
}

async function excluirPeca(cookie: string, idpeca: string): Promise<void> {
  const res = await fetch(`${BASE}/ajax/exclui_lote.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `${BASE}/listar_pecas.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ idpeca }).toString(),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// POST /api/leilao/excluir-peca
// Body: { leilao: string, nome: string, referencia: string, lote: number }
export async function POST(req: Request) {
  let body: { leilao?: string; nome?: string; referencia?: string; lote?: number };
  try { body = await req.json(); } catch { return Response.json({ error: 'Body inválido' }, { status: 400 }); }

  const { leilao, nome, referencia, lote } = body;
  if (!leilao || !nome || !referencia || !lote) {
    return Response.json({ error: 'leilao, nome, referencia e lote são obrigatórios' }, { status: 400 });
  }

  const creds = getCreds(nome);
  if (!creds) return Response.json({ error: `Sem credenciais para "${nome}"` }, { status: 400 });

  try {
    const cookie = await loginLeiloesbr(creds.user, creds.pass, creds.numLeilao);

    console.log(`[excluir-peca] buscando lote=${lote} ref="${referencia}" no leilao N°${leilao}`);
    const idpeca = await findIdpecaByLote(cookie, leilao, lote);

    if (!idpeca) {
      return Response.json(
        { error: `Lote ${lote} (${referencia}) não encontrado no leilão N°${leilao}` },
        { status: 404 },
      );
    }

    console.log(`[excluir-peca] lote=${lote} ref="${referencia}" → idpeca=${idpeca} — excluindo`);
    await excluirPeca(cookie, idpeca);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[excluir-peca]', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 500 });
  }
}
