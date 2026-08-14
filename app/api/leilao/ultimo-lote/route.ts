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

function cleanCell(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

// Raspa listar_pecas.asp e retorna o maior Lote + todas as refs (segunda_descricao) presentes
async function scrapeLeilao(cookie: string, leilao: string): Promise<{ ultimoLote: number; refsPresentes: string[] }> {
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

  // Colunas por linha: 0=ID(6-9 dígitos), 1=Comitente, 2=Lote, 3=Peça(descrição), 4=2ª Desc(REF), ...
  // Extrai linha a linha para pegar a REF (segunda_descricao = células[4])
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));

  let maxLote = 0;
  const refsPresentes: string[] = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id    = cells[0]?.trim();
    if (!id || !/^\d{6,9}$/.test(id)) continue;

    // Lote está na coluna 2
    const loteNum = Number(cells[2]?.replace(/\D/g, '') ?? '0');
    if (loteNum > 0 && loteNum <= 9999 && loteNum > maxLote) maxLote = loteNum;

    // segunda_descricao (REF) está na coluna 4 — campo Descricao_2 enviado pelo robô de cadastro
    // O valor é a referência pura (ex: AB123, 12345) sem texto adicional
    const ref = cells[4]?.trim();
    if (ref && /^[A-Z0-9]{3,10}$/i.test(ref)) {
      refsPresentes.push(ref.toUpperCase());
    }
  }

  return { ultimoLote: maxLote, refsPresentes };
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
    const cookie = await loginLeiloesbr(creds.user, creds.pass, leilao);
    const { ultimoLote, refsPresentes } = await scrapeLeilao(cookie, leilao);
    return Response.json({ ultimoLote, refsPresentes });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 },
    );
  }
}
