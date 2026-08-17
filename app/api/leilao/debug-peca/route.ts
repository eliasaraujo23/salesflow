export const maxDuration = 60;

import { loadPecaFormHtml, extractPecaFields, gravarPeca } from '../_peca-form';

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

  // Método correto: POST com tipo=3 e ID — como o painel JS faz
  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie, 'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${BASE}/listar_pecas.asp`,
    },
    body: new URLSearchParams({ tipo: '3', ID: pieceId }).toString(),
    redirect: 'follow',
  });
  const html = await res.text();

  // Extrai todos os inputs/selects/textareas do formulário
  const fields: Record<string, string> = {};
  for (const m of html.matchAll(/<input[^>]+>/gi)) {
    const tag   = m[0];
    const name  = tag.match(/name=["']([^"']+)["']/i)?.[1];
    const type  = (tag.match(/type=["']?([^"'\s>]+)/i)?.[1] ?? 'text').toLowerCase();
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '';
    if (name) fields[`INPUT[${type}]:${name}`] = value;
  }
  for (const m of html.matchAll(/<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi)) {
    const inner    = m[2];
    const selOpt   = inner.match(/<option[^>]+selected[^>]*value=["']([^"']*)["']/i)?.[1]
                  ?? inner.match(/<option[^>]+value=["']([^"']*)["'][^>]*selected/i)?.[1] ?? '(nenhum)';
    const firstOpt = inner.match(/<option[^>]+value=["']([^"']*)["']/i)?.[1] ?? '';
    fields[`SELECT:${m[1]}`] = selOpt + ' (first=' + firstOpt + ')';
  }
  for (const m of html.matchAll(/<textarea[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/textarea>/gi)) {
    fields[`TEXTAREA:${m[1]}`] = m[2].slice(0, 200);
  }

  // Encontra scripts JS incluídos neste fragmento
  const scriptSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);

  return Response.json({
    fields,
    scriptSrcs,
    totalLen: html.length,
    html,
  });
}

// POST /api/leilao/debug-peca
// Body: { pieceId, leilao, nome, patch: { ID_Cliente: "257103", ... } }
export async function POST(req: Request) {
  const body = await req.json() as { pieceId: string; leilao: string; nome: string; patch: Record<string, string> };
  const { pieceId, leilao, nome, patch } = body;

  const n = nome.toUpperCase();
  let user = '', pass = '';
  if (n.startsWith('ETERNNO')) { user = process.env.LEILOESBR_USER_ETERNNO ?? ''; pass = process.env.LEILOESBR_PASS_ETERNNO ?? ''; }
  if (n.startsWith('BRUNO'))   { user = process.env.LEILOESBR_USER_BARAUJO ?? ''; pass = process.env.LEILOESBR_PASS_BARAUJO ?? ''; }

  const initRes    = await fetch(`${BASE}/default.asp?Log=off`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const sessionId  = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';
  const loginRes   = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': sessionId, 'User-Agent': UA },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: leilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  const cookie = (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;

  const html   = await loadPecaFormHtml(cookie, pieceId);
  const fields = extractPecaFields(html);

  if (fields.size < 3) {
    return Response.json({ error: `Formulário não carregou (${fields.size} campos)`, htmlPreview: html.slice(0, 300) }, { status: 500 });
  }

  // Garante que o ID da peça está sempre presente — sem isso o servidor cria uma peça nova
  fields.set('ID', pieceId);
  for (const [k, v] of Object.entries(patch)) fields.set(k, v);
  fields.set('Botao', 'Gravar');

  const result = await gravarPeca(cookie, fields);
  return Response.json({ result, fieldsSent: Object.fromEntries(fields) });
}
