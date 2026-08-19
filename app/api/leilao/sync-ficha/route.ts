import { NextResponse } from 'next/server';

export const maxDuration = 60;

const BASE = 'https://www.leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ─── Auth ─────────────────────────────────────────────────────────────────────

interface Conta { user: string; pass: string; prefixo: string; cor: string }

function getContas(): Conta[] {
  const contas: Conta[] = [];
  const eu = process.env.LEILOESBR_USER_ETERNNO;
  const ep = process.env.LEILOESBR_PASS_ETERNNO;
  if (eu && ep) contas.push({ user: eu, pass: ep, prefixo: 'ETERNNO', cor: '#16a34a' });
  const bu = process.env.LEILOESBR_USER_BARAUJO;
  const bp = process.env.LEILOESBR_PASS_BARAUJO;
  if (bu && bp) contas.push({ user: bu, pass: bp, prefixo: 'BRUNO',   cor: '#ea580c' });
  return contas;
}

async function login(user: string, pass: string): Promise<string> {
  const initRes  = await fetch(`${BASE}/default.asp?Log=off`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';
  const loginRes  = await fetch(`${BASE}/default.asp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': sessionId, 'User-Agent': UA },
    body:    new URLSearchParams({ Login: user, Senha: pass, NumLeilao: '', Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

function mapStatus(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes('venda') || (s.includes('p') && s.includes('s'))) return 'venda_pos_leilao';
  if (s.includes('convite') && s.includes('cat'))                   return 'convite_catalogo';
  if (s.includes('convite'))                                        return 'convite';
  if (s.includes('finaliz') || s.includes('encerr'))               return 'finalizado';
  if (s.includes('capt'))                                           return 'captando';
  return 'convite_catalogo';
}

function parseDate(raw: string): string {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ─── Buscar lista de leilões de uma conta ─────────────────────────────────────

interface LeilaoRemoto {
  codigoPlatforma: string;
  nome:            string;
  numero:          string;
  status:          string;
  dataInicio:      string;
  dataFim:         string;
  cor:             string;
}

async function fetchListaLeiloes(conta: Conta): Promise<LeilaoRemoto[]> {
  const cookie = await login(conta.user, conta.pass);

  // listar_leiloes.asp — tabela com todos os leilões da conta
  const res = await fetch(`${BASE}/listar_leiloes.asp`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_leiloes.asp` },
    redirect: 'follow',
    signal:   AbortSignal.timeout(25_000),
  });
  const html = await res.text();

  const leiloes: LeilaoRemoto[] = [];
  // Cada linha da tabela: <tr> com células Num, Título, Status, DtInicio, DtFim
  // Formato típico: link para cad_leilao.asp?Id=XXXXX com o número
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of html.matchAll(rowRe)) {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => cleanHtml(m[1]));
    if (cells.length < 3) continue;

    // Número do leilão: primeira célula com só dígitos (5-6 chars)
    const num = cells.find(c => /^\d{4,6}$/.test(c.trim()));
    if (!num) continue;

    // Status: célula que contém palavras chave conhecidas
    const statusRaw = cells.find(c => {
      const cl = c.toLowerCase();
      return cl.includes('convite') || cl.includes('captando') ||
             cl.includes('finaliz') || cl.includes('venda');
    }) ?? '';

    // Datas: células no formato dd/mm/yyyy
    const datas = cells.filter(c => /^\d{2}\/\d{2}\/\d{4}$/.test(c.trim()));

    // Título: célula mais longa que não é data nem número
    const titulo = cells.find(c => c.length > 10 && !/^\d+$/.test(c) && !/^\d{2}\//.test(c)) ?? '';

    // Número sequencial (#XX) extraído do título
    const seqMatch = titulo.match(/^(\d+)[ºª°]/);
    const numero = seqMatch ? seqMatch[1] : num;

    leiloes.push({
      codigoPlatforma: num.trim(),
      nome:            `${conta.prefixo} ${titulo}`.trim(),
      numero,
      status:          mapStatus(statusRaw),
      dataInicio:      datas[0] ? parseDate(datas[0]) : '',
      dataFim:         datas[1] ? parseDate(datas[1]) : datas[0] ? parseDate(datas[0]) : '',
      cor:             conta.cor,
    });
  }

  return leiloes;
}

// ─── Rota POST — retorna lista de leilões de todas as contas ──────────────────

export async function POST(): Promise<NextResponse> {
  const contas = getContas();
  if (contas.length === 0)
    return NextResponse.json({ error: 'Sem credenciais configuradas' }, { status: 500 });

  try {
    const resultados = await Promise.allSettled(contas.map(c => fetchListaLeiloes(c)));

    const todos: LeilaoRemoto[] = [];
    for (const r of resultados) {
      if (r.status === 'fulfilled') todos.push(...r.value);
    }

    if (todos.length === 0)
      return NextResponse.json({ error: 'Nenhum leilão encontrado nas contas' }, { status: 500 });

    return NextResponse.json({ leiloes: todos });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 });
  }
}

// GET: debug — ?lista=1 mostra HTML bruto do listar_leiloes.asp
export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const conta = getContas()[0];
  if (!conta) return NextResponse.json({ error: 'Sem credenciais' }, { status: 500 });

  try {
    const cookie = await login(conta.user, conta.pass);

    // ?lista=1 — HTML bruto da listagem
    if (searchParams.get('lista') === '1') {
      const res  = await fetch(`${BASE}/listar_leiloes.asp`, {
        headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_leiloes.asp` },
        redirect: 'follow',
        signal:   AbortSignal.timeout(25_000),
      });
      const html = await res.text();
      const snippet = html.length > 30000 ? html.slice(0, 30000) : html;
      return new NextResponse(`<pre>${snippet.replace(/</g, '&lt;')}</pre>`, { headers: { 'Content-Type': 'text/html' } });
    }

    // ?leilao=XXXXX — ficha individual
    const leilao = searchParams.get('leilao')?.trim() ?? '';
    if (!leilao) return NextResponse.json({ error: 'Parâmetro: leilao ou lista=1' }, { status: 400 });

    const res = await fetch(`${BASE}/cad_leilao.asp?Num=${encodeURIComponent(leilao)}`, {
      headers: { 'Cookie': cookie, 'User-Agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    const html = await res.text();

    if (searchParams.get('debug') === '1') {
      const tail = html.length > 20000 ? html.slice(-20000) : html;
      return new NextResponse(`<pre>${tail.replace(/</g, '&lt;')}</pre>`, { headers: { 'Content-Type': 'text/html' } });
    }

    const statusMatch = html.match(/<select[^>]+name=["']?Status["']?[^>]*>([\s\S]*?)<\/select>/i);
    let rawStatus = '';
    if (statusMatch) {
      const opt = statusMatch[1].match(/<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i);
      if (opt) rawStatus = cleanHtml(opt[1]);
    }
    const dtInicioMatch = html.match(/name=["']?DtInicio["']?[^>]+value=["']([^"']+)["']/i);
    const dtFimMatch    = html.match(/name=["']?DtFim["']?[^>]+value=["']([^"']+)["']/i);

    return NextResponse.json({
      codigoPlatforma: leilao,
      rawStatus,
      status:    rawStatus ? mapStatus(rawStatus) : '',
      dataInicio: dtInicioMatch ? parseDate(dtInicioMatch[1]) : '',
      dataFim:    dtFimMatch    ? parseDate(dtFimMatch[1])    : '',
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 });
  }
}
