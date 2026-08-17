// Utilitário compartilhado para carregar e gravar o formulário de peça no leiloesbr
// O painel usa POST tipo=3+ID para carregar o HTML com campos preenchidos (editaPeca)
// e envia os campos com os nomes mapeados abaixo (gravacadpeca em ficha-peca.js)

const BASE = 'https://www.leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Mapeamento id HTML → nome do campo no POST (conforme ficha-peca.js gravacadpeca)
const ID_TO_POST: Record<string, string> = {
  'ID_Peca':          'ID',
  'ID_Cliente':       'ID_Cliente',
  'ID_Leilao':        'ID_Leilao',
  'NumLeilao':        'NumLeilao',
  'ID_Tipo':          'ID_Tipo',
  'ID_Artista':       'ID_Artista',
  'Item':             'Item',
  'Carteado':         'Carteado',
  'Valor_Contratado': 'Valor_Contratado',
  'Taxa':             'Taxa',
  'Taxa_Leiloeiro':   'Taxa_Leiloeiro',
  'Peca':             'Peca',
  'Descricao':        'Descricao',
  'Descricao_2':      'Descricao_2',
  'Lote':             'Lote',
  'Extra':            'Extra',
  'Dia':              'Dia',
  'Dt_Nota':          'Dt_Nota',
  'ID_Comprador':     'ID_Comprador',
  'Dt_Acerto':        'Dt_Acerto',
  'Valor_Venda':      'Valor_Venda',
  'Cartela':          'Cartela',
  'Nota':             'Nota',
  'ID_COld':          'ID_COld',
  'Site':             'Site',
  'Destaque':         'Destaque',
  'Incremento':       'Incremento',
  'dtVenda':          'Dt_Venda',
  'oldcartela':       'oldCartela',
  'youtubeLink':      'youtubeLink',
};

// Carrega formulário real da peça via POST tipo=3 (mesmo que editaPeca do JS do painel)
export async function loadPecaFormHtml(cookie: string, pieceId: string): Promise<string> {
  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie, 'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${BASE}/listar_pecas.asp`,
    },
    body: new URLSearchParams({ tipo: '3', ID: pieceId }).toString(),
    redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  return res.text();
}

// Extrai campos do HTML e monta Map com os nomes que o POST de gravação espera
export function extractPecaFields(html: string): Map<string, string> {
  const byId   = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const m of html.matchAll(/<input[^>]+>/gi)) {
    const tag  = m[0];
    const type = (tag.match(/type=["']?([^"'\s>]+)/i)?.[1] ?? 'text').toLowerCase();
    if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') continue;
    const id    = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const name  = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    // Checkboxes: 1 se checked, 0 se não — painel usa vsite=1/0
    const value = type === 'checkbox'
      ? (/\bchecked\b/i.test(tag) ? '1' : '0')
      : (tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '');
    if (id)   byId.set(id, value);
    if (name) byName.set(name, value);
  }

  for (const m of html.matchAll(/<select[^>]*>([\s\S]*?)<\/select>/gi)) {
    const tag   = m[0];
    const id    = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const name  = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const inner = m[1];
    const sel   = inner.match(/<option[^>]+selected[^>]*value=["']([^"']*)["']/i)?.[1]
               ?? inner.match(/<option[^>]+value=["']([^"']*)["'][^>]*selected/i)?.[1]
               ?? inner.match(/<option[^>]+value=["']([^"']*)["']/i)?.[1] ?? '';
    if (id)   byId.set(id, sel);
    if (name) byName.set(name, sel);
  }

  for (const m of html.matchAll(/<textarea[^>]*>([\s\S]*?)<\/textarea>/gi)) {
    const tag  = m[0];
    const id   = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const val  = m[1];
    if (id)   byId.set(id, val);
    if (name) byName.set(name, val);
  }

  // Monta o POST fields usando o mapeamento id→postName
  const fields = new Map<string, string>();
  for (const [htmlId, postName] of Object.entries(ID_TO_POST)) {
    const val = byId.get(htmlId) ?? byName.get(postName) ?? byName.get(htmlId);
    if (val !== undefined) fields.set(postName, val);
  }
  // Inclui campos com name que não estão no mapeamento
  for (const [name, val] of byName) {
    if (!fields.has(name)) fields.set(name, val);
  }

  return fields;
}

// Grava a peça com os campos fornecidos
export async function gravarPeca(
  cookie: string,
  fields: Map<string, string>,
): Promise<string> {
  const params = new URLSearchParams();
  for (const [k, v] of fields) params.append(k, v);

  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie, 'User-Agent': UA,
      'Referer': `${BASE}/cad_peca.asp`,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: params.toString(), redirect: 'follow', signal: AbortSignal.timeout(30_000),
  });
  return res.text();
}
