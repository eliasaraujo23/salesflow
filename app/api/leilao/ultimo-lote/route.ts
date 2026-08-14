export const maxDuration = 30;

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

// Scrapia listar_pecas.asp e retorna o maior Lote encontrado (0 se leilão vazio)
async function getUltimoLote(cookie: string, leilao: string): Promise<number> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `${BASE}/listar_pecas.asp?Listar=on&Leilao=${leilao}`,
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

  // Extrai todos os tds, procura coluna Lote (índice 2: ID, Comitente, Lote, ...)
  const allTds = [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim());

  let maxLote = 0;
  for (let i = 0; i + 2 < allTds.length; i++) {
    const rawId  = allTds[i]?.trim();
    const rawLot = allTds[i + 2]?.replace(/\s/g, '').replace(/\D/g, '');
    if (rawId && /^\d{6,9}$/.test(rawId)) {
      const loteNum = Number(rawLot);
      if (loteNum > 0 && loteNum <= 9999 && loteNum > maxLote) maxLote = loteNum;
    }
  }

  return maxLote;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const leilao = searchParams.get('leilao') ?? '';
  const nome   = searchParams.get('nome')   ?? '';

  if (!leilao || !nome) {
    return Response.json({ error: 'leilao e nome são obrigatórios' }, { status: 400 });
  }

  const creds = getCreds(nome);
  if (!creds) {
    return Response.json({ error: `Sem credenciais para "${nome}"` }, { status: 400 });
  }

  try {
    const cookie    = await loginLeiloesbr(creds.user, creds.pass, leilao);
    const ultimoLote = await getUltimoLote(cookie, leilao);
    return Response.json({ ultimoLote });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    );
  }
}
