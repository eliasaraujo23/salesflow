export const maxDuration = 60;

const BASE = 'https://leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function getCreds(nome: string): { user: string; pass: string; numLeilao: string } | null {
  const n = nome.toUpperCase();
  if (n.startsWith('ETERNNO')) {
    const user      = process.env.LEILOESBR_USER_ETERNNO;
    const pass      = process.env.LEILOESBR_PASS_ETERNNO;
    const numLeilao = process.env.LEILOESBR_NUM_ETERNNO;
    return user && pass && numLeilao ? { user, pass, numLeilao } : null;
  }
  if (n.startsWith('BRUNO')) {
    const user      = process.env.LEILOESBR_USER_BARAUJO;
    const pass      = process.env.LEILOESBR_PASS_BARAUJO;
    const numLeilao = process.env.LEILOESBR_NUM_BARAUJO;
    return user && pass && numLeilao ? { user, pass, numLeilao } : null;
  }
  return null;
}

async function loginLeiloesbr(user: string, pass: string, numLeilao: string): Promise<string> {
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
  });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';

  const loginRes = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie':        sessionId,
      'Referer':       `${BASE}/default.asp?Log=off`,
      'User-Agent':    UA,
    },
    body: new URLSearchParams({ Login: user, Senha: pass, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });

  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

function cleanCell(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();
}

// Export XLS: lote → segunda_descricao (ref). Mesma lógica do remover-duplicatas.
async function exportLoteRef(cookie: string, leilao: string): Promise<Map<string, string>> {
  const res = await fetch(`${BASE}/ajax/exportalotes.asp?Leilao=${leilao}`, {
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Export falhou: HTTP ${res.status}`);
  const html = await res.text();

  const segments  = html.split(/<\/tr>/i);
  const headerSeg = segments[0] ?? '';
  const headers   = [...headerSeg.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => cleanCell(m[1]));

  const idxLote = headers.findIndex(h => /^lote$/i.test(h));
  const idxRef  = headers.findIndex(h => /minidesc|mini|descri.o.2|segunda/i.test(h));

  console.log(`[excluir-peca] export headers: ${JSON.stringify(headers)} idxLote=${idxLote} idxRef=${idxRef}`);

  if (idxLote < 0) return new Map();

  // Índice da coluna Descrição (descrição longa, contém "| REF: XXXXX" no final)
  const idxDesc = headers.findIndex(h => /^descri/i.test(h) && !/mini|2/i.test(h));
  console.log(`[excluir-peca] idxDesc=${idxDesc} idxRef=${idxRef}`);

  const map = new Map<string, string>();
  for (const seg of segments.slice(1)) {
    const cells = [...seg.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    if (cells.length === 0) continue;
    const lote = cells[idxLote]?.trim();
    if (!lote) continue;

    // Tenta MiniDescrição primeiro (segunda_descricao = ref pura)
    let ref = idxRef >= 0 ? cells[idxRef]?.trim().toUpperCase() : '';

    // Se vazio, extrai de "| REF: XXXXX" na Descrição longa
    if (!ref && idxDesc >= 0) {
      const desc = cells[idxDesc] ?? '';
      const m = desc.match(/\|\s*REF:\s*([A-Z0-9]+)/i);
      if (m) ref = m[1].toUpperCase();
    }

    if (lote && ref) map.set(lote, ref);
  }
  return map;
}

// Listagem AJAX: lote → idpeca. Mesma lógica do remover-duplicatas.
async function listingLoteId(cookie: string, leilao: string): Promise<Map<string, string>> {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `https://www.leiloesbr.com.br/painel_lbr/listar_pecas.asp?Listar=on&Leilao=${leilao}`,
      'Accept':           'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({
      Listar: 'on', Leilao: leilao,
      Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '',
      Descricao: '', Dia: '', Item: '', IdT: '', Nota: '',
      DtNI: '', DtNF: '', DtSI: '', DtSF: '', DtAI: '', DtAF: '',
      ID_Clil: '', ID_ClIF: '', Extra: '', TaxaL: '',
      Site: '', Ft: '', Gbl: '', Dv: '', DESTAQUE_O: '',
      PVendal: '', PVendaF: '', Avall: '', AvalF: '',
      saida: '', order: '',
      Botao: 'Pesquisar',
      Tipo: '1',
    }).toString(),
    redirect: 'follow',
  });
  const html = await res.text();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));
  const map  = new Map<string, string>();
  for (const row of rows) {
    const cells  = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const idpeca = cells[0]?.trim();
    const lote   = cells[2]?.trim();
    if (idpeca && lote && /^\d{6,9}$/.test(idpeca)) map.set(lote, idpeca);
  }
  return map;
}

async function excluirPeca(cookie: string, idpeca: string): Promise<void> {
  const res = await fetch(`${BASE}/ajax/exclui_lote.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `${BASE}/listar_pecas.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ idpeca }).toString(),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// POST /api/leilao/excluir-peca
// Body: { leilao: string, nome: string, referencia: string }
export async function POST(req: Request) {
  let body: { leilao?: string; nome?: string; referencia?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'Body inválido' }, { status: 400 }); }

  const { leilao, nome, referencia } = body;
  if (!leilao || !nome || !referencia) {
    return Response.json({ error: 'leilao, nome e referencia são obrigatórios' }, { status: 400 });
  }

  const creds = getCreds(nome);
  if (!creds) return Response.json({ error: `Sem credenciais para "${nome}"` }, { status: 400 });

  try {
    const cookie = await loginLeiloesbr(creds.user, creds.pass, creds.numLeilao);

    // Mesma lógica do remover-duplicatas: dois fetches em paralelo, cruza por lote
    const [loteRefMap, loteIdMap] = await Promise.all([
      exportLoteRef(cookie, leilao),
      listingLoteId(cookie, leilao),
    ]);

    console.log(`[excluir-peca] loteRefMap=${loteRefMap.size} loteIdMap=${loteIdMap.size}`);

    const targetRef = referencia.toUpperCase();
    let   idpeca: string | null = null;

    for (const [lote, ref] of loteRefMap) {
      if (ref === targetRef) {
        idpeca = loteIdMap.get(lote) ?? null;
        console.log(`[excluir-peca] ref="${referencia}" → lote=${lote} → idpeca=${idpeca}`);
        break;
      }
    }

    if (!idpeca) {
      // Log amostra para debug
      const sample = [...loteRefMap.entries()].slice(0, 5);
      console.log(`[excluir-peca] nao encontrada. Sample loteRef: ${JSON.stringify(sample)}`);
      return Response.json(
        { error: `Peça "${referencia}" não encontrada no leilão N°${leilao}` },
        { status: 404 },
      );
    }

    await excluirPeca(cookie, idpeca);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[excluir-peca]', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Erro desconhecido' }, { status: 500 });
  }
}
