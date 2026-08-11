import { NextResponse } from 'next/server';

const BASE = 'https://leiloesbr.com.br/painel_lbr';

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

async function loginAndExport(user: string, pass: string, numLeilao: string): Promise<string> {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  const initRes = await fetch(`${BASE}/default.asp?Log=off`, {
    headers: { 'User-Agent': ua },
    redirect: 'follow',
  });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';

  const loginRes = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionId,
      'Referer': `${BASE}/default.asp?Log=off`,
      'User-Agent': ua,
    },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });

  const newCookie = (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;

  const exportRes = await fetch(`${BASE}/ajax/exportalotes.asp?Leilao=${numLeilao}`, {
    headers: { 'Cookie': newCookie, 'User-Agent': ua, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow',
  });

  if (!exportRes.ok) throw new Error(`Export falhou: HTTP ${exportRes.status}`);
  return exportRes.text();
}

function parseHtmlTable(html: string): { refs: string[]; vendidos: string[]; pricePerRef: Record<string, number> } {
  // HTML é malformado: apenas a 1ª linha de dados tem <tr> de abertura.
  // Divide pelo fechamento </tr> para extrair cada linha.
  const segments = html.split(/<\/tr>/i);

  const headerSeg = segments[0] ?? '';
  const headers = [...headerSeg.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, '').trim());

  if (headers.length === 0) return { refs: [], vendidos: [], pricePerRef: {} };

  const idxMini  = headers.findIndex(h => /minidesc|mini/i.test(h));
  const idxValor = headers.findIndex(h => /valorvend/i.test(h));
  const idxBase  = headers.findIndex(h => /^base$/i.test(h));

  if (idxMini < 0) return { refs: [], vendidos: [], pricePerRef: {} };

  const refs: string[] = [];
  const vendidos: string[] = [];
  const pricePerRef: Record<string, number> = {};

  for (const seg of segments.slice(1)) {
    const cells = [...seg.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim());
    if (cells.length === 0) continue;

    const ref = (cells[idxMini] ?? '').toUpperCase().trim();
    if (!ref) continue;

    refs.push(ref);
    if (idxValor >= 0) {
      const v = parseFloat((cells[idxValor] ?? '').replace(',', '.')) || 0;
      if (v > 0) vendidos.push(ref);
    }
    if (idxBase >= 0) {
      const p = parseFloat((cells[idxBase] ?? '').replace(',', '.')) || 0;
      if (p > 0) pricePerRef[ref] = p;
    }
  }

  return { refs, vendidos, pricePerRef };
}

interface LeilaoInput {
  codigoPlatforma: string;
  nome:            string;
  numero:          string;
}

export interface SyncResult {
  codigoPlatforma: string;
  nome:            string;
  numero:          string;
  refs?:           string[];
  vendidos?:       string[];
  pricePerRef?:    Record<string, number>;
  count?:          number;
  skipped:         boolean;
  reason?:         string;
  error?:          string;
}

export async function POST(req: Request) {
  const body    = await req.json() as { leiloes?: LeilaoInput[] };
  const leiloes = Array.isArray(body.leiloes) ? body.leiloes : [];

  const eligible = leiloes.filter(l => l.codigoPlatforma?.trim());

  const settled = await Promise.allSettled(
    eligible.map(async (l): Promise<SyncResult> => {
      const creds = getCreds(l.nome);
      if (!creds) {
        return { codigoPlatforma: l.codigoPlatforma, nome: l.nome, numero: l.numero, skipped: true, reason: 'Sem credenciais para este tipo de leilão' };
      }

      const html   = await loginAndExport(creds.user, creds.pass, l.codigoPlatforma);
      const parsed = parseHtmlTable(html);

      return {
        codigoPlatforma: l.codigoPlatforma,
        nome:            l.nome,
        numero:          l.numero,
        refs:            parsed.refs,
        vendidos:        parsed.vendidos,
        pricePerRef:     parsed.pricePerRef,
        count:           parsed.refs.length,
        skipped:         false,
      };
    }),
  );

  const data: SyncResult[] = settled.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      codigoPlatforma: eligible[i].codigoPlatforma,
      nome:            eligible[i].nome,
      numero:          eligible[i].numero,
      skipped:         true,
      error:           r.reason instanceof Error ? r.reason.message : 'Erro desconhecido',
    };
  });

  return NextResponse.json({ data });
}
