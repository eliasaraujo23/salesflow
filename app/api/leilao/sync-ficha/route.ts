import { NextResponse } from 'next/server';

export const maxDuration = 60;

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
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': sessionId, 'User-Agent': UA },
    body:    new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

function cleanHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

// Mapeia o status do leiloesbr para o enum do SalesFlow
function mapStatus(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes('venda') || s.includes('p') && s.includes('s'))   return 'venda_pos_leilao';
  if (s.includes('convite') && s.includes('cat'))                   return 'convite_catalogo';
  if (s.includes('convite'))                                        return 'convite';
  if (s.includes('finaliz') || s.includes('encerr'))               return 'finalizado';
  if (s.includes('capt'))                                           return 'captando';
  return 'convite_catalogo'; // default seguro para leilões ativos
}

// Parseia dd/mm/yyyy → yyyy-mm-dd
function parseDate(raw: string): string {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export interface FichaResult {
  codigoPlatforma: string;
  status:          string;
  dataInicio:      string; // yyyy-MM-dd
  dataFim:         string; // yyyy-MM-dd
  rawStatus:       string;
}

async function fetchFicha(numLeilao: string, nome: string): Promise<FichaResult> {
  const creds = getCreds(nome);
  if (!creds) throw new Error(`Sem credenciais para "${nome}"`);

  const cookie = await login(creds.user, creds.pass, numLeilao);

  const res = await fetch(`${BASE}/ficha_leilao.asp`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie':        cookie,
      'User-Agent':    UA,
      'Referer':       `${BASE}/ficha_leilao.asp`,
    },
    body:    new URLSearchParams({ NumLeilao: numLeilao }).toString(),
    redirect: 'follow',
    signal:  AbortSignal.timeout(20_000),
  });

  const html = await res.text();

  // Status: <select name="Status"> <option value="X" selected>Label</option>
  const statusMatch = html.match(/<select[^>]+name=["']?Status["']?[^>]*>([\s\S]*?)<\/select>/i);
  let rawStatus = '';
  if (statusMatch) {
    const selHtml   = statusMatch[1];
    const selOption = selHtml.match(/<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i);
    if (selOption) rawStatus = cleanHtml(selOption[1]);
  }

  // Datas: <input name="DtInicio" value="dd/mm/yyyy">
  const dtInicioMatch = html.match(/<input[^>]+name=["']?DtInicio["']?[^>]+value=["']([^"']+)["']/i)
    ?? html.match(/name=["']?DtInicio["']?[^>]+value=["']([^"']+)["']/i);
  const dtFimMatch = html.match(/<input[^>]+name=["']?DtFim["']?[^>]+value=["']([^"']+)["']/i)
    ?? html.match(/name=["']?DtFim["']?[^>]+value=["']([^"']+)["']/i);

  return {
    codigoPlatforma: numLeilao,
    status:          rawStatus ? mapStatus(rawStatus) : '',
    dataInicio:      dtInicioMatch ? parseDate(dtInicioMatch[1]) : '',
    dataFim:         dtFimMatch    ? parseDate(dtFimMatch[1])    : '',
    rawStatus,
  };
}

// GET /api/leilao/sync-ficha?leilao=63382&nome=ETERNNO
export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const leilao = searchParams.get('leilao')?.trim() ?? '';
  const nome   = searchParams.get('nome')?.trim()   ?? '';

  if (!leilao || !nome)
    return NextResponse.json({ error: 'Parâmetros: leilao, nome' }, { status: 400 });

  try {
    const ficha = await fetchFicha(leilao, nome);
    return NextResponse.json(ficha);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 });
  }
}
