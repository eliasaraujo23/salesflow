import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';

export const maxDuration = 300;

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

// Busca listagem completa de todas as peças do leilão
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

interface PieceInfo { pieceId: string; temPrincipal: boolean; temExtra: boolean; }

// Parse listagem completa: detecta peças sem foto principal e/ou sem extras.
// data-func="subirimgpeca|ID|ID.jpg" → tem principal
// data-func="subirimgpeca|ID"        → sem principal
// data-func="geremimgpeca|ID" com is-color9 → sem extras
// data-func="geremimgpeca|ID" com is-color10 → tem extras
function parsePieceInfo(html: string): Map<number, PieceInfo> {
  const map  = new Map<number, PieceInfo>();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));

  for (const row of rows) {
    const inner = row[1];

    const mainMatch  = inner.match(/data-func="subirimgpeca\|(\d+)([^"]*)"/i);
    if (!mainMatch) continue;

    const temPrincipal = mainMatch[2].includes('.jpg');

    // Detecta extras: procura o botão geremimgpeca e sua classe
    const extraMatch   = inner.match(/class="([^"]*?)\s+is-tabletool\s+is-extraimg[^"]*"[^>]*data-func="geremimgpeca/i)
                      ?? inner.match(/data-func="geremimgpeca[^"]*"[^>]*class="([^"]*)"/i);
    const extraClass   = extraMatch?.[1] ?? '';
    const temExtra     = extraClass.includes('is-color10');

    // Só inclui peças que estão incompletas (sem principal OU sem extra)
    if (temPrincipal && temExtra) continue;

    const cells = [...inner.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const pieceId = (cells[0] ?? '').trim();
    if (!/^\d{6,9}$/.test(pieceId)) continue;
    const lote = parseInt(cells[2] ?? '', 10);
    if (!lote || lote > 9999) continue;

    map.set(lote, { pieceId, temPrincipal, temExtra });
  }
  return map;
}

export interface PecaSemFoto {
  lote:          number;
  ref:           string;
  pieceId:       string;
  temPrincipal:  boolean;
  temExtra:      boolean;
}

export interface ScanSemFotoResult {
  total:   number;
  semFoto: number;
  pecas:   PecaSemFoto[];
}

// Verifica diretamente no CDN se a foto é um JPEG real (não placeholder/broken)
// Baixa apenas os primeiros 3 bytes para checar a assinatura JPEG (FF D8 FF)
// Resultado possível: 'jpeg' = foto real, 'nofile' = 404/sem arquivo, 'unknown' = erro/timeout
async function cdnCheckFoto(numLeilao: string, pieceId: string): Promise<'jpeg' | 'nofile' | 'unknown'> {
  try {
    const url = `https://www.leiloesbr.com.br/imagens/img_g/${numLeilao}/${pieceId}.jpg`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Range': 'bytes=0-2' },
      signal: AbortSignal.timeout(8_000),
      redirect: 'follow',
    });
    if (res.status === 404) return 'nofile';
    if (!res.ok && res.status !== 206) return 'unknown';
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 2) return 'unknown';
    const bytes = new Uint8Array(buf);
    return (bytes[0] === 0xFF && bytes[1] === 0xD8) ? 'jpeg' : 'nofile';
  } catch (e) {
    return 'unknown';
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const leilao   = searchParams.get('leilao')?.trim() ?? '';
  const nome     = searchParams.get('nome')?.trim() ?? '';
  const debug    = searchParams.get('debug') === '1';
  const checkCdn = searchParams.get('checkCdn') === '1';
  // Modo manual: lotes específicos (ex: ?lotes=4,14,17)
  const lotesParam = searchParams.get('lotes')?.trim() ?? '';
  const lotesManual = lotesParam
    ? new Set(lotesParam.split(',').map(s => parseInt(s.trim(), 10)).filter(n => n > 0))
    : null;
  // Modo manual: referências específicas (ex: ?refs=T12345,M5625)
  const refsParam = searchParams.get('refs')?.trim() ?? '';
  const refsManual = refsParam
    ? new Set(refsParam.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))
    : null;

  if (!leilao || !nome)
    return NextResponse.json({ error: 'Parâmetros: leilao, nome' }, { status: 400 });

  const creds = getCreds(nome);
  if (!creds)
    return NextResponse.json({ error: 'Sem credenciais para este leilão' }, { status: 400 });

  try {
    const cookie = await login(creds.user, creds.pass, leilao);

    // Busca XLS (lote→ref) e listagem completa em paralelo
    const [xlsHtml, todasHtml] = await Promise.all([
      exportXls(cookie, leilao),
      listarTodas(cookie, leilao),
    ]);

    // Modo debug: mostra HTML raw das células de ícone de uma linha específica (por lote)
    // Use &lote=23 para inspecionar uma peça específica
    const debugLote = searchParams.get('lote');
    if (debug) {
      const allDataRows = [...todasHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
        .filter(m => m[1].includes('<td'));

      if (debugLote) {
        // Encontra a linha com esse lote específico
        const targetRow = allDataRows.find(m => {
          const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => cleanCell(c[1]));
          return cells[2] === debugLote;
        });
        if (!targetRow) return NextResponse.json({ error: `Lote ${debugLote} não encontrado` });
        const cells = [...targetRow[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => c[1]);
        return NextResponse.json({
          firstCellsClean: cells.slice(0, 4).map(c => cleanCell(c)),
          // Raw das células dos ícones (últimas 4)
          iconCellsRaw: cells.slice(-4),
          hasColor9: targetRow[1].includes('is-color9'),
          hasColor10: targetRow[1].includes('is-color10'),
        });
      }

      const semFotoRows = allDataRows.filter(m => m[1].includes('is-color9'));
      const sample = semFotoRows.slice(0, 3).map(m => {
        const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(c => cleanCell(c[1]));
        return { pieceId: cells[0], lote: cells[2], desc: cells[3]?.slice(0, 60) };
      });
      return NextResponse.json({
        totalRows:    allDataRows.length,
        semFotoRows:  semFotoRows.length,
        sample,
      });
    }

    const loteRef   = parseXls(xlsHtml);           // lote → ref (todas as peças)
    const pieceInfo = parsePieceInfo(todasHtml);   // lote → { pieceId, temPrincipal, temExtra } (só incompletas)

    // lote → pieceId de TODAS as linhas do HTML (incluindo as "completas" que o parsePieceInfo ignora)
    const loteIdAll = new Map<number, string>();
    for (const row of [...todasHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'))) {
      const cells   = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
      const pieceId = (cells[0] ?? '').trim();
      if (!/^\d{6,9}$/.test(pieceId)) continue;
      const lote    = parseInt(cells[2] ?? '', 10);
      if (!lote || lote > 9999) continue;
      loteIdAll.set(lote, pieceId);
    }

    // Modo checkCdn: verifica TODAS as peças do XLS no CDN diretamente
    // Necessário porque o painel engana — mostra botão colorido mesmo sem foto no CDN (bug de upload antigo)
    const cdnSemFoto = new Set<string>(); // pieceIds sem foto no CDN
    if (checkCdn) {
      const allPieceIds: { pieceId: string; lote: number }[] = [];
      for (const [lote] of loteRef) {
        const pieceId = loteIdAll.get(lote);
        if (pieceId) allPieceIds.push({ pieceId, lote });
      }

      // Verifica CDN em batches de 20 paralelos
      const BATCH = 20;
      let unknownCount = 0;
      for (let i = 0; i < allPieceIds.length; i += BATCH) {
        const batch   = allPieceIds.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async ({ pieceId }) => ({ pieceId, result: await cdnCheckFoto(leilao, pieceId) }))
        );
        // Log do primeiro batch para diagnóstico
        if (i === 0) {
          console.log(`[scan-sem-foto] CDN sample batch[0]:`, results.slice(0, 5).map(r => `${r.pieceId}=${r.result}`).join(' '));
        }
        for (const { pieceId, result } of results) {
          if (result === 'nofile') cdnSemFoto.add(pieceId);
          if (result === 'unknown') unknownCount++;
        }
      }
      console.log(`[scan-sem-foto] CDN done: semFoto=${cdnSemFoto.size} unknown=${unknownCount} total=${allPieceIds.length}`);
    }

    const semFoto: PecaSemFoto[] = [];

    if (checkCdn) {
      // Retorna todas as peças sem foto no CDN (independente do que o painel diz)
      for (const [lote, pieceId] of loteIdAll) {
        if (!cdnSemFoto.has(pieceId)) continue;
        const info = pieceInfo.get(lote);
        const ref  = loteRef.get(lote) ?? '';
        semFoto.push({
          lote, ref, pieceId,
          temPrincipal: false, // CDN não tem = sem foto real
          temExtra:     info?.temExtra ?? false,
        });
      }
    } else {
      for (const [lote, info] of pieceInfo) {
        const ref = loteRef.get(lote) ?? '';
        semFoto.push({ lote, ref, pieceId: info.pieceId, temPrincipal: info.temPrincipal, temExtra: info.temExtra });
      }
    }

    // Modo manual por lotes ou referências
    if (lotesManual || refsManual) {
      // Mapa inverso ref → lote (construído sob demanda)
      const refLoteMap = refsManual ? new Map<string, number>() : null;
      if (refLoteMap) {
        for (const [lote, ref] of loteRef) refLoteMap.set(ref.toUpperCase(), lote);
      }

      const lotesAlvo: Set<number> = lotesManual
        ? lotesManual
        : new Set([...refsManual!].map(r => refLoteMap!.get(r)).filter((n): n is number => n !== undefined));

      const pecasManual: PecaSemFoto[] = [];
      for (const lote of lotesAlvo) {
        const pieceId = loteIdAll.get(lote);
        if (!pieceId) continue;
        const ref  = loteRef.get(lote) ?? '';
        const info = pieceInfo.get(lote);
        pecasManual.push({ lote, ref, pieceId, temPrincipal: info?.temPrincipal ?? true, temExtra: info?.temExtra ?? false });
      }
      pecasManual.sort((a, b) => a.lote - b.lote);
      return NextResponse.json({ total: loteRef.size, semFoto: pecasManual.length, pecas: pecasManual } satisfies ScanSemFotoResult);
    }

    semFoto.sort((a, b) => a.lote - b.lote);

    console.log(`[scan-sem-foto] leilao=${leilao} xlsTotal=${loteRef.size} htmlTotal=${loteIdAll.size} cdnCheck=${checkCdn} semFoto=${semFoto.length}`);

    return NextResponse.json({
      total:   loteRef.size,
      semFoto: semFoto.length,
      pecas:   semFoto,
      cdnCheck: checkCdn,
      _debug: checkCdn ? { xlsTotal: loteRef.size, htmlTotal: loteIdAll.size } : undefined,
    } satisfies ScanSemFotoResult & { cdnCheck?: boolean; _debug?: unknown });

  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro desconhecido' },
      { status: 500 },
    );
  }
}
