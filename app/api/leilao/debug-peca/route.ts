export const maxDuration = 60;

const BASE = 'https://www.leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function login(user: string, pass: string, numLeilao: string): Promise<string> {
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';
  const loginRes  = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': sessionId, 'User-Agent': UA },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

// GET /api/leilao/debug-peca?pieceId=32059090&leilao=63756&nome=BRUNO
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const pieceId = searchParams.get('pieceId') ?? '';
  const leilao  = searchParams.get('leilao') ?? '';
  const nome    = searchParams.get('nome') ?? '';

  const n = nome.toUpperCase();
  let user = '', pass = '';
  if (n.startsWith('ETERNNO')) { user = process.env.LEILOESBR_USER_ETERNNO ?? ''; pass = process.env.LEILOESBR_PASS_ETERNNO ?? ''; }
  if (n.startsWith('BRUNO'))   { user = process.env.LEILOESBR_USER_BARAUJO ?? ''; pass = process.env.LEILOESBR_PASS_BARAUJO ?? ''; }

  const cookie = await login(user, pass, leilao);
  const res    = await fetch(`${BASE}/cad_peca.asp?ID=${pieceId}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA },
    redirect: 'follow',
  });
  const html = await res.text();

  // Extrai todos os inputs/selects/textareas do formulário
  const fields: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]+>/gi)) {
    const tag   = m[0];
    const name  = tag.match(/name=["']([^"']+)["']/i)?.[1];
    const type  = (tag.match(/type=["']?([^"'\s>]+)/i)?.[1] ?? 'text').toLowerCase();
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '(sem value)';
    if (name) fields[`INPUT[${type}]:${name}`] = value;
  }
  for (const m of html.matchAll(/<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)) {
    const inner   = m[2];
    const selOpt  = inner.match(/<option[^>]+selected[^>]*value=["']([^"']*)["']/i)?.[1]
                 ?? inner.match(/<option[^>]+value=["']([^"']*)["'][^>]*selected/i)?.[1] ?? '(nenhum selected)';
    fields[`SELECT:${m[1]}`] = selOpt;
  }
  for (const m of html.matchAll(/<textarea[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/textarea>/gi)) {
    fields[`TEXTAREA:${m[1]}`] = m[2].slice(0, 80);
  }

  // Busca o HTML completo e extrai trechos relevantes
  const formMatch   = html.match(/<form[\s\S]*?<\/form>/i);
  const ajaxCalls   = [...html.matchAll(/\$\.ajax\([\s\S]{0,300}?\)/gi)].map(m => m[0]);
  const fetchCalls  = [...html.matchAll(/fetch\(['"`][^'"`]+['"`]/gi)].map(m => m[0]);
  const aspUrls     = [...html.matchAll(/['"`]([^'"`]*\.asp[^'"`]*?)['"`]/gi)].map(m => m[1]);
  const scriptSrcs  = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);

  return Response.json({
    fields,
    formHtml:   formMatch?.[0]?.slice(0, 5000) ?? '(sem form)',
    ajaxCalls,
    fetchCalls,
    aspUrls:    [...new Set(aspUrls)],
    scriptSrcs,
    totalLen:   html.length,
    // HTML completo para inspecionar
    html: html,
  });
}
