import { NextResponse } from 'next/server';

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
  const initRes  = await fetch(`${BASE}/default.asp?Log=off`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';
  const loginRes  = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': sessionId, 'User-Agent': UA },
    body:    new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

function cleanHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

export interface Lance {
  cliente:       string;
  cartela:       string;
  lote:          number;
  data:          string;
  nome:          string;
  status:        string;
  tipo:          string;
  valor:         number;
  valorContrato: number;
}

export interface LancesResult {
  lances: Lance[];
  total:  number;
}

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const leilao = searchParams.get('leilao')?.trim() ?? '';
  const nome   = searchParams.get('nome')?.trim() ?? '';

  if (!leilao || !nome)
    return NextResponse.json({ error: 'Parâmetros: leilao, nome' }, { status: 400 });

  const creds = getCreds(nome);
  if (!creds)
    return NextResponse.json({ error: `Sem credenciais para "${nome}"` }, { status: 400 });

  try {
    const cookie = await login(creds.user, creds.pass, leilao);

    const res = await fetch(`${BASE}/modulos/listar-lances/listarlances.asp`, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/x-www-form-urlencoded',
        'Cookie':            cookie,
        'User-Agent':        UA,
        'Referer':           `${BASE}/listar_lances.asp`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body:    new URLSearchParams({ DCLI: '', Lotel: '', LoteF: '', diaf: '', s: 'on' }).toString(),
      redirect: 'follow',
      signal:   AbortSignal.timeout(30_000),
    });
    console.log('[lances] listarlances.asp status:', res.status, 'content-type:', res.headers.get('content-type'));

    const html = await res.text();
    console.log('[lances] html length:', html.length, 'sample:', html.slice(0, 400));

    // Debug: log cells of first data row
    let debugDone = false;

    // Parse table rows — skip header rows
    const lances: Lance[] = [];
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    for (const rowMatch of html.matchAll(rowRe)) {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanHtml(m[1]));
      if (cells.length < 8) continue;

      // Skip header rows (first cell is not a number = client id link)
      const clienteRaw = cells[0];
      if (!clienteRaw || !/\d/.test(clienteRaw)) continue;

      const lote = parseInt(cells[2] ?? '', 10);
      if (!lote) continue;

      if (!debugDone) {
        console.log('[lances] cells:', cells);
        debugDone = true;
      }

      // Parse valor: "790.00" (ponto decimal, sem separador de milhar)
      const parseVal = (s: string) => parseFloat(s.trim()) || 0;

      lances.push({
        cliente:       clienteRaw.replace(/\D/g, ''),   // só o número do cliente
        cartela:       cells[1] ?? '',
        lote,
        data:          cells[3] ?? '',
        nome:          cells[4] ?? '',
        status:        cells[5] ?? '',
        tipo:          cells[6] ?? '',
        valor:         parseVal(cells[7] ?? ''),
        valorContrato: parseVal(cells[8] ?? ''),
      });
    }

    return NextResponse.json({ lances, total: lances.length } satisfies LancesResult);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 });
  }
}
