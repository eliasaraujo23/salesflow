import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';

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

// ─── Trocar leilão ativo e buscar ficha ──────────────────────────────────────

async function trocarLeilao(cookie: string, num: string): Promise<string> {
  // trocar_leilao.asp?A=Md&Id=NUM → 302 → default.asp (troca o leilão ativo na sessão)
  // Usamos redirect:'manual' para capturar o Set-Cookie do 302 antes de seguir
  const res = await fetch(`${BASE}/trocar_leilao.asp?A=Md&Id=${encodeURIComponent(num)}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_trocar_leilao.asp` },
    redirect: 'manual',
    signal: AbortSignal.timeout(10_000),
  });
  // Pega novo cookie do 302 se houver; senão mantém o atual
  const setCookie = res.headers.get('set-cookie') ?? '';
  const newCookie = setCookie.match(/ASPSESSIONID\w+=\w+/i)?.[0];
  return newCookie ?? cookie;
}

function parseFicha(html: string): { status: string; dataInicio: string; dataFim: string } {
  const statusMatch = html.match(/<select[^>]+name=["']?Status["']?[^>]*>([\s\S]*?)<\/select>/i);
  let rawStatus = '';
  if (statusMatch) {
    const opt = statusMatch[1].match(/<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i);
    if (opt) rawStatus = cleanHtml(opt[1]);
  }
  function extractVal(fieldName: string): string {
    const r1 = new RegExp(`name=["']?${fieldName}["']?[^>]*value=["']([^"']*?)["']`, 'i');
    const m1 = html.match(r1);
    if (m1?.[1]) return m1[1];
    const r2 = new RegExp(`value=["']([^"']*?)["'][^>]*name=["']?${fieldName}["']?`, 'i');
    return html.match(r2)?.[1] ?? '';
  }
  return {
    status:     rawStatus ? mapStatus(rawStatus) : '',
    dataInicio: parseDate(extractVal('Dt_I')),
    dataFim:    parseDate(extractVal('Dt_F')),
  };
}

async function fetchFicha(cookie: string, num: string): Promise<{ status: string; dataInicio: string; dataFim: string; _debug?: string }> {
  try {
    const sessionCookie = await trocarLeilao(cookie, num);
    const res = await fetch(`${BASE}/cadleilao.asp?Leilao=${encodeURIComponent(num)}`, {
      headers: { 'Cookie': sessionCookie, 'User-Agent': UA, 'Referer': `${BASE}/default.asp` },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    const html = await res.text();
    const parsed = parseFicha(html);
    if (!parsed.dataFim) {
      const snippet = html.slice(0, 300).replace(/\s+/g, ' ');
      return { ...parsed, _debug: snippet };
    }
    return parsed;
  } catch (e) {
    return { status: '', dataInicio: '', dataFim: '', _debug: String(e) };
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
  _debug?:         string;
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

  // Pré-filtro por título: só busca ficha dos leilões do mês atual e próximo
  // Evita 124 requests desnecessários para leilões históricos
  const now      = new Date();
  const MESES: Record<string, number> = {
    janeiro:1, fevereiro:2, março:3, abril:4, maio:5, junho:6,
    julho:7, agosto:8, setembro:9, outubro:10, novembro:11, dezembro:12,
  };
  function tituloNoRange(titulo: string): boolean {
    // Extrai "Agosto de 2026" ou "Setembro2026" do título
    const m = titulo.match(/([a-záéíóúãâêôç]+)\s*(?:de\s*)?(\d{4})/i);
    if (!m) return false;
    const mes = MESES[m[1].toLowerCase()];
    const ano = parseInt(m[2]);
    if (!mes || !ano) return false;
    const lYM    = ano * 100 + mes;
    const thisYM = now.getFullYear() * 100 + (now.getMonth() + 1);
    const nextM  = now.getMonth() === 11 ? 1 : now.getMonth() + 2;
    const nextY  = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const nextYM = nextY * 100 + nextM;
    return lYM === thisYM || lYM === nextYM;
  }

  const candidatos = leiloes.filter(l => tituloNoRange(l.observacao));

  const tasks = candidatos.map(l => () => fetchFicha(cookie, l.codigoPlatforma));
  const fichas = await pLimit(tasks, 3);
  fichas.forEach((f, idx) => {
    candidatos[idx].status     = f.status;
    candidatos[idx].dataInicio = f.dataInicio;
    candidatos[idx].dataFim    = f.dataFim;
    if (f._debug) candidatos[idx]._debug = f._debug;
  });

  return candidatos;
}

// ─── Rota POST — retorna lista de leilões de todas as contas ──────────────────

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

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

    // Filtra só mês atual e próximo (por dataFim)
    const now       = new Date();
    const thisYM    = now.getFullYear() * 100 + now.getMonth();
    const nextYM    = now.getMonth() === 11
      ? (now.getFullYear() + 1) * 100 + 0
      : now.getFullYear() * 100 + now.getMonth() + 1;

    const comData   = todos.filter(l => !!l.dataFim);
    const filtrados = comData.filter(l => {
      const [y, m] = l.dataFim.split('-').map(Number);
      const lYM = y * 100 + (m - 1);
      return lYM === thisYM || lYM === nextYM;
    });

    // Se filtrou tudo, retorna diagnóstico em vez de erro genérico
    if (filtrados.length === 0) {
      // Pega debug do primeiro leilão sem data
      const semData = todos.filter(l => !l.dataFim) as (LeilaoRemoto & { _debug?: string })[];
      const debugSnippet = semData[0]?._debug ?? '(sem debug)';
      return NextResponse.json({
        error: `Nenhum leilão no mês atual/próximo. Total: ${todos.length}, com data: ${comData.length}. HTML snippet: ${debugSnippet}`,
      }, { status: 500 });
    }

    return NextResponse.json({ leiloes: filtrados });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 });
  }
}

// GET: debug — ?lista=1 mostra HTML bruto do listar_leiloes.asp
export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

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

    // ?parse=1 — mostra resultado do parser + trechos relevantes do HTML
    function extractVal(name: string): string {
      const r1 = new RegExp(`name=["']?${name}["']?[^>]*value=["']([^"']*?)["']`, 'i');
      const m1 = html.match(r1);
      if (m1?.[1]) return m1[1];
      const r2 = new RegExp(`value=["']([^"']*?)["'][^>]*name=["']?${name}["']?`, 'i');
      return html.match(r2)?.[1] ?? '';
    }
    const dtI = extractVal('Dt_I');
    const dtF = extractVal('Dt_F');
    const statusMatch = html.match(/<select[^>]+name=["']?Status["']?[^>]*>([\s\S]*?)<\/select>/i);
    let rawStatus = '';
    if (statusMatch) {
      const opt = statusMatch[1].match(/<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i);
      if (opt) rawStatus = cleanHtml(opt[1]);
    }

    if (searchParams.get('parse') === '1') {
      // Extrai trecho do HTML em torno de Dt_I para diagnóstico
      const idx = html.search(/Dt_I/i);
      const snippet = idx >= 0 ? html.slice(Math.max(0, idx - 100), idx + 200) : '(Dt_I não encontrado no HTML)';
      return NextResponse.json({
        htmlLength: html.length,
        dt_i_raw: dtI, dt_f_raw: dtF,
        dataInicio: parseDate(dtI), dataFim: parseDate(dtF),
        rawStatus, status: rawStatus ? mapStatus(rawStatus) : '',
        snippet,
      });
    }

    return NextResponse.json({
      codigoPlatforma: leilao,
      rawStatus,
      status:    rawStatus ? mapStatus(rawStatus) : '',
      dataInicio: parseDate(dtI),
      dataFim:    parseDate(dtF),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro' }, { status: 500 });
  }
}
