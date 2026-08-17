import { NextResponse } from 'next/server';

export const maxDuration = 60;

const BASE = 'https://leiloesbr.com.br/painel_lbr';
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
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';
  const loginRes  = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionId, 'Referer': `${BASE}/default.asp?Log=off`, 'User-Agent': UA,
    },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });
  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

function cleanCell(raw: string): string {
  return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').replace(/&amp;/g, '&').trim();
}

// Busca o XLS — tem REF (MiniDescrição) e Lote
async function exportXls(cookie: string, numLeilao: string): Promise<string> {
  const res = await fetch(`${BASE}/ajax/exportalotes.asp?Leilao=${numLeilao}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Export XLS falhou: HTTP ${res.status}`);
  return res.text();
}

// Busca a listagem AJAX filtrando por Ft=0 (sem foto principal)
// Ft=0 faz o servidor retornar apenas peças sem foto — evita parsear coluna numérica
async function listarSemFoto(cookie: string, numLeilao: string): Promise<string> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie, 'User-Agent': UA,
      'Origin': 'https://www.leiloesbr.com.br',
      'Referer': `${BASE}/listar_pecas.asp?Listar=on&Leilao=${numLeilao}`,
      'Accept': 'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      Listar: 'on', Leilao: numLeilao,
      Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '', Descricao: '',
      Dia: '', Item: '', IdT: '', Nota: '',
      DtNI: '', DtNF: '', DtSI: '', DtSF: '', DtAI: '', DtAF: '',
      ID_Clil: '', ID_ClIF: '', Extra: '', TaxaL: '',
      Site: '', Ft: '0', Gbl: '', Dv: '', DESTAQUE_O: '',
      PVendal: '', PVendaF: '', Avall: '', AvalF: '',
      saida: '', order: '', Botao: 'Pesquisar', Tipo: '1',
    }).toString(),
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  return res.text();
}

// Busca listagem completa (sem filtro de foto) — usada só para debug
async function listarTodas(cookie: string, numLeilao: string): Promise<string> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie, 'User-Agent': UA,
      'Origin': 'https://www.leiloesbr.com.br',
      'Referer': `${BASE}/listar_pecas.asp?Listar=on&Leilao=${numLeilao}`,
      'Accept': 'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      Listar: 'on', Leilao: numLeilao,
      Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '', Descricao: '',
      Dia: '', Item: '', IdT: '', Nota: '',
      DtNI: '', DtNF: '', DtSI: '', DtSF: '', DtAI: '', DtAF: '',
      ID_Clil: '', ID_ClIF: '', Extra: '', TaxaL: '',
      Site: '', Ft: '', Gbl: '', Dv: '', DESTAQUE_O: '',
      PVendal: '', PVendaF: '', Avall: '', AvalF: '',
      saida: '', order: '', Botao: 'Pesquisar', Tipo: '1',
    }).toString(),
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  return res.text();
}

// Parse XLS: extrai lote → ref
function parseXls(html: string): Map<number, string> {
  const map      = new Map<number, string>();
  const segments = html.split(/<\/tr>/i);
  const headers  = [...(segments[0] ?? '').matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
    .map(m => cleanCell(m[1]));
  const idxMini  = headers.findIndex(h => /minidesc|mini/i.test(h));
  const idxLote  = headers.findIndex(h => /^(item|lote)$/i.test(h));
  if (idxMini < 0) return map;

  for (const seg of segments.slice(1)) {
    const cells = [...seg.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    if (cells.length === 0) continue;
    const ref  = (cells[idxMini] ?? '').toUpperCase().trim();
    const lote = parseInt(idxLote >= 0 ? (cells[idxLote] ?? '') : '', 10);
    if (ref && lote > 0) map.set(lote, ref);
  }
  return map;
}

// Parse listagem AJAX filtrada por Ft=0 (sem foto): extrai lote → pieceId
// O servidor já filtrou — todas as linhas retornadas são peças sem foto
// Colunas: 0=ID(6-9d), 1=Comitente, 2=Lote(≤9999), ...
function parseLotePieceId(html: string): Map<number, string> {
  const map  = new Map<number, string>();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));

    const pieceId = (cells[0] ?? '').trim();
    if (!/^\d{6,9}$/.test(pieceId)) continue;

    const lote = parseInt(cells[2] ?? '', 10);
    if (!lote || lote > 9999) continue;

    map.set(lote, pieceId);
  }
  return map;
}

export interface PecaSemFoto {
  lote:       number;
  ref:        string;
  pieceId:    string;
  nFotos:     number; // -1 = desconhecido
  siteAtivo:  boolean;
}

export interface ScanSemFotoResult {
  total:   number;
  semFoto: number;
  pecas:   PecaSemFoto[];
}

export async function GET(req: Request): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const leilao = searchParams.get('leilao')?.trim() ?? '';
  const nome   = searchParams.get('nome')?.trim() ?? '';
  const debug  = searchParams.get('debug') === '1';

  if (!leilao || !nome)
    return NextResponse.json({ error: 'Parâmetros: leilao, nome' }, { status: 400 });

  const creds = getCreds(nome);
  if (!creds)
    return NextResponse.json({ error: 'Sem credenciais para este leilão' }, { status: 400 });

  try {
    const cookie = await login(creds.user, creds.pass, leilao);

    // Busca XLS (lote→ref) e listagem filtrada Ft=0 (lote→pieceId de peças sem foto) em paralelo
    const [xlsHtml, semFotoHtml] = await Promise.all([
      exportXls(cookie, leilao),
      listarSemFoto(cookie, leilao),
    ]);

    // Modo debug: retorna HTML raw das últimas 3 células de 5 linhas para inspecionar ícones de foto
    if (debug) {
      const allHtml = await listarTodas(cookie, leilao);
      const allDataRows = [...allHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
        .filter(m => m[1].includes('<td'));
      const totalRows = allDataRows.length;
      // Pega 5 linhas espalhadas (início, meio, fim)
      const indices = [0, 1, Math.floor(totalRows / 2), totalRows - 2, totalRows - 1].filter(i => i >= 0 && i < totalRows);
      const rowSamples = indices.map(i => {
        const cells = [...allDataRows[i][1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => c[1]);
        return {
          index: i,
          // Últimas 4 células (onde ficam os ícones de foto, editar, etc.)
          lastCellsRaw: cells.slice(-4),
          // Primeiras 4 células (ID, comitente, lote, etc.)
          firstCellsClean: cells.slice(0, 4).map(c => cleanCell(c)),
        };
      });
      return NextResponse.json({ totalRows, rowSamples });
    }

    const loteRef     = parseXls(xlsHtml);           // lote → ref (todas as peças)
    const lotePieceId = parseLotePieceId(semFotoHtml); // lote → pieceId (só sem foto, filtrado pelo servidor)

    const semFoto: PecaSemFoto[] = [];
    for (const [lote, pieceId] of lotePieceId) {
      const ref = loteRef.get(lote) ?? '';
      semFoto.push({ lote, ref, pieceId, nFotos: 0, siteAtivo: false });
    }
    semFoto.sort((a, b) => a.lote - b.lote);

    return NextResponse.json({
      total:   loteRef.size,  // total de peças no leilão (pelo XLS)
      semFoto: semFoto.length,
      pecas:   semFoto,
    } satisfies ScanSemFotoResult);

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 },
    );
  }
}
