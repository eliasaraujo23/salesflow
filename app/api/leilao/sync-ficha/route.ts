import { NextResponse } from 'next/server';

export const maxDuration = 300;

const BASE = 'https://www.leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ─── Auth ─────────────────────────────────────────────────────────────────────

interface Conta { user: string; pass: string; prefixo: string; cor: string; numLeilao: string }

function getContas(): Conta[] {
  const contas: Conta[] = [];
  const eu = process.env.LEILOESBR_USER_ETERNNO;
  const ep = process.env.LEILOESBR_PASS_ETERNNO;
  const en = process.env.LEILOESBR_NUM_ETERNNO ?? '';
  if (eu && ep) contas.push({ user: eu, pass: ep, prefixo: 'ETERNNO', cor: '#0d9488', numLeilao: en });
  const bu = process.env.LEILOESBR_USER_BARAUJO;
  const bp = process.env.LEILOESBR_PASS_BARAUJO;
  const bn = process.env.LEILOESBR_NUM_BARAUJO ?? '';
  if (bu && bp) contas.push({ user: bu, pass: bp, prefixo: 'BRUNO',   cor: '#ea580c', numLeilao: bn });
  return contas;
}

async function login(user: string, pass: string, numLeilao: string): Promise<string> {
  const initRes   = await fetch(`${BASE}/default.asp?Log=off`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';
  const loginRes  = await fetch(`${BASE}/default.asp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': sessionId, 'User-Agent': UA },
    body:    new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  const newCookie = (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0];
  return newCookie ?? sessionId;
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

// ─── Buscar ficha individual (datas + status) ─────────────────────────────────

async function fetchFicha(cookie: string, num: string): Promise<{ status: string; dataInicio: string; dataFim: string }> {
  try {
    const res = await fetch(`${BASE}/cadleilao.asp?Leilao=${encodeURIComponent(num)}`, {
      headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_leiloes.asp` },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
    const html = await res.text();
    const statusMatch = html.match(/<select[^>]+name=["']?Status["']?[^>]*>([\s\S]*?)<\/select>/i);
    let rawStatus = '';
    if (statusMatch) {
      const opt = statusMatch[1].match(/<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i);
      if (opt) rawStatus = cleanHtml(opt[1]);
    }
    // Pega value de input independente da ordem dos atributos (value pode vir antes ou depois de name)
    function extractInputValue(fieldName: string): string {
      // Caso 1: name antes do value
      const re1 = new RegExp(`name=["']?${fieldName}["']?[^>]*value=["']([^"']*?)["']`, 'i');
      const m1  = html.match(re1);
      if (m1?.[1]) return m1[1];
      // Caso 2: value antes do name
      const re2 = new RegExp(`value=["']([^"']*?)["'][^>]*name=["']?${fieldName}["']?`, 'i');
      const m2  = html.match(re2);
      return m2?.[1] ?? '';
    }
    return {
      status:     rawStatus ? mapStatus(rawStatus) : 'convite_catalogo',
      dataInicio: parseDate(extractInputValue('Dt_I')),
      dataFim:    parseDate(extractInputValue('Dt_F')),
    };
  } catch {
    return { status: 'convite_catalogo', dataInicio: '', dataFim: '' };
  }
}

async function pLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
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
  observacao:      string;
}

async function fetchListaLeiloes(conta: Conta): Promise<LeilaoRemoto[]> {
  const cookie = await login(conta.user, conta.pass, conta.numLeilao);

  // listar_trocar_leilao.asp — lista completa usada pelo dropdown de seleção de leilão
  const res = await fetch(`${BASE}/listar_trocar_leilao.asp`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/default.asp` },
    redirect: 'follow',
    signal:   AbortSignal.timeout(25_000),
  });
  const html = await res.text();

  const leiloes: LeilaoRemoto[] = [];

  // Formato: data-info="63873 - ETERNNO - 65º Leilão de Joias..."
  const rowRe = /data-info="(\d+)\s*-\s*[^-]+-\s*([^"]+)"/gi;
  for (const m of html.matchAll(rowRe)) {
    const num   = m[1].trim();
    const titulo = m[2].trim();
    if (!num || !titulo) continue;

    // Número sequencial extraído do título (ex: "65º" → "65")
    const seqMatch = titulo.match(/^#?(\d+)[ºª°]/);
    const numero   = seqMatch ? seqMatch[1] : num;

    // Nome curto: só o prefixo da conta (ex: "ETERNNO", "BRUNO TOP")
    // O título completo vai em observacao para referência
    const isTop = /alto\s*luxo|top/i.test(titulo);
    const tipo  = isTop ? `${conta.prefixo} TOP` : conta.prefixo;

    // Cores conforme TIPOS_LEILAO no modal
    const COR_TOP: Record<string, string> = { ETERNNO: '#2563eb', BRUNO: '#d97706', '24K': '#db2777' };
    const cor = isTop ? (COR_TOP[conta.prefixo] ?? conta.cor) : conta.cor;

    leiloes.push({
      codigoPlatforma: num,
      nome:            tipo,
      numero,
      status:          'convite_catalogo',
      dataInicio:      '',
      dataFim:         '',
      cor,
      observacao:      titulo,
    });
  }

  // Busca datas e status de cada leilão em paralelo (concorrência 8)
  const tasks = leiloes.map(l => () => fetchFicha(cookie, l.codigoPlatforma));
  const fichas = await pLimit(tasks, 8);
  fichas.forEach((f, idx) => {
    leiloes[idx].status     = f.status;
    leiloes[idx].dataInicio = f.dataInicio;
    leiloes[idx].dataFim    = f.dataFim;
  });

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
    const cookie = await login(conta.user, conta.pass, conta.numLeilao);

    // ?lista=1 — chama o endpoint AJAX que o JS usa para buscar a listagem
    if (searchParams.get('lista') === '1') {
      // O JS faz GET para listar_leiloes.asp?Listar=on com os filtros em branco
      const url = `${BASE}/listar_leiloes.asp?Listar=on&Numero=&Site=&Datafim=&Datafim2=&order=`;
      const res  = await fetch(url, {
        headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_leiloes.asp`, 'X-Requested-With': 'XMLHttpRequest' },
        redirect: 'follow',
        signal:   AbortSignal.timeout(25_000),
      });
      const html = await res.text();
      const snippet = html.length > 30000 ? html.slice(0, 30000) : html;
      return new NextResponse(`<pre>${snippet.replace(/</g, '&lt;')}</pre>`, { headers: { 'Content-Type': 'text/html' } });
    }

    // ?modulo=1 — tenta o endpoint do módulo AJAX diretamente
    if (searchParams.get('modulo') === '1') {
      const url = `${BASE}/modulos/listar-leiloes/listar-leiloes.asp?Listar=on&Numero=&Site=&Datafim=&Datafim2=&order=`;
      const res  = await fetch(url, {
        headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_leiloes.asp`, 'X-Requested-With': 'XMLHttpRequest' },
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

    const res = await fetch(`${BASE}/cadleilao.asp?Leilao=${encodeURIComponent(leilao)}`, {
      headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_leiloes.asp` },
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
