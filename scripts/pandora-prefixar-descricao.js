// Script descartável — prefixa a Descricao de cada peça do leilão Pandora com o
// código/variação já salvo em Descricao_2, ex:
//   antes: "Anel A Bela e a Fera da Disney"
//   depois: "799643C01-2/50 - Anel A Bela e a Fera da Disney"
//
// Uso:  node --env-file=.env scripts/pandora-prefixar-descricao.js 64491
//       node --env-file=.env scripts/pandora-prefixar-descricao.js 64491 --limit=3   (testa só 3 peças)
//       node --env-file=.env scripts/pandora-prefixar-descricao.js 64491 --dry-run   (só mostra, não grava)
//
// Apagar este arquivo depois de usar (uso único, não faz parte do app).

const BASE = 'https://www.leiloesbr.com.br/painel_lbr';
const UA   = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const args = process.argv.slice(2);
const numLeilao = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
const skipArg = args.find(a => a.startsWith('--skip='));
const skip = skipArg ? Number(skipArg.split('=')[1]) : 0;

if (!numLeilao) {
  console.error('Uso: node --env-file=.env scripts/pandora-prefixar-descricao.js <numLeilao> [--limit=N] [--skip=N] [--dry-run]');
  process.exit(1);
}

const USER = process.env.LEILOESBR_USER_ETERNNO;
const PASS = process.env.LEILOESBR_PASS_ETERNNO;
if (!USER || !PASS) {
  console.error('Faltam LEILOESBR_USER_ETERNNO / LEILOESBR_PASS_ETERNNO no .env');
  process.exit(1);
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login() {
  const initRes = await fetch(`${BASE}/default.asp?Log=off`, { headers: { 'User-Agent': UA } });
  const sessionId = (initRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? '';

  const loginRes = await fetch(`${BASE}/default.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionId, 'Referer': `${BASE}/default.asp?Log=off`, 'User-Agent': UA,
    },
    body: new URLSearchParams({ Login: USER, Senha: PASS, NumLeilao: numLeilao, Acessar: 'Acessar' }).toString(),
    redirect: 'manual',
  });

  return (loginRes.headers.get('set-cookie') ?? '').match(/ASPSESSIONID\w+=\w+/i)?.[0] ?? sessionId;
}

// ─── Lista todas as peças do leilão ──────────────────────────────────────────

function cleanCell(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

function buildListingBody() {
  return new URLSearchParams({
    Listar: 'on', Leilao: numLeilao,
    Peca: '', Lotel: '', LoteF: '', Cartela: '', Cart: '',
    Descricao: '', Dia: '', Item: '', IdT: '', Nota: '',
    DtNI: '', DtNF: '', DtSI: '', DtSF: '', DtAI: '', DtAF: '',
    ID_Clil: '', ID_ClIF: '', Extra: '', TaxaL: '',
    Site: '', Ft: '', Gbl: '', Dv: '', DESTAQUE_O: '',
    PVendal: '', PVendaF: '', Avall: '', AvalF: '',
    saida: '', order: '',
    Botao: 'Pesquisar', Tipo: '1',
  }).toString();
}

async function listarPecas(cookie) {
  const res = await fetch(`${BASE}/listar_pecas.asp`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie':           cookie,
      'User-Agent':       UA,
      'Origin':           'https://www.leiloesbr.com.br',
      'Referer':          `${BASE}/listar_pecas.asp?Listar=on&Leilao=${numLeilao}`,
      'Accept':           'text/html, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: buildListingBody(),
  });
  const html = await res.text();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].filter(m => m[1].includes('<td'));
  const pecas = [];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => cleanCell(m[1]));
    const id = cells[0]?.trim();
    if (id && /^\d{6,}$/.test(id)) pecas.push({ pieceId: id });
  }
  return pecas;
}

// ─── Form da peça (extrai/grava campos, igual a app/api/leilao/_peca-form.ts) ──

const ID_TO_POST = {
  'ID_Peca': 'ID', 'ID_Cliente': 'ID_Cliente', 'ID_Leilao': 'ID_Leilao', 'NumLeilao': 'NumLeilao',
  'ID_Tipo': 'ID_Tipo', 'ID_Artista': 'ID_Artista', 'Item': 'Item', 'Carteado': 'Carteado',
  'Valor_Contratado': 'Valor_Contratado', 'Taxa': 'Taxa', 'Taxa_Leiloeiro': 'Taxa_Leiloeiro',
  'Peca': 'Peca', 'Descricao': 'Descricao', 'Descricao_2': 'Descricao_2', 'Lote': 'Lote',
  'Extra': 'Extra', 'Dia': 'Dia', 'Dt_Nota': 'Dt_Nota', 'ID_Comprador': 'ID_Comprador',
  'Dt_Acerto': 'Dt_Acerto', 'Valor_Venda': 'Valor_Venda', 'Cartela': 'Cartela', 'Nota': 'Nota',
  'ID_COld': 'ID_COld', 'Site': 'Site', 'Destaque': 'Destaque', 'Incremento': 'Incremento',
  'dtVenda': 'Dt_Venda', 'oldcartela': 'oldCartela', 'youtubeLink': 'youtubeLink',
};

async function loadPecaFormHtml(cookie, pieceId) {
  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie, 'User-Agent': UA,
      'X-Requested-With': 'XMLHttpRequest', 'Referer': `${BASE}/listar_pecas.asp`,
    },
    body: new URLSearchParams({ tipo: '3', ID: pieceId }).toString(),
  });
  return res.text();
}

function extractPecaFields(html) {
  const byId = new Map();
  const byName = new Map();

  for (const m of html.matchAll(/<input[^>]+>/gi)) {
    const tag = m[0];
    const type = (tag.match(/type=["']?([^"'\s>]+)/i)?.[1] ?? 'text').toLowerCase();
    if (type === 'submit' || type === 'button' || type === 'image' || type === 'file') continue;
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const value = type === 'checkbox'
      ? (/\bchecked\b/i.test(tag) ? '1' : '0')
      : (tag.match(/value=["']([^"']*)["']/i)?.[1] ?? '');
    if (id) byId.set(id, value);
    if (name) byName.set(name, value);
  }
  for (const m of html.matchAll(/<select[^>]*>([\s\S]*?)<\/select>/gi)) {
    const tag = m[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const inner = m[1];
    const sel = inner.match(/<option[^>]+selected[^>]*value=["']([^"']*)["']/i)?.[1]
             ?? inner.match(/<option[^>]+value=["']([^"']*)["'][^>]*selected/i)?.[1]
             ?? inner.match(/<option[^>]+value=["']([^"']*)["']/i)?.[1] ?? '';
    if (id) byId.set(id, sel);
    if (name) byName.set(name, sel);
  }
  for (const m of html.matchAll(/<textarea[^>]*>([\s\S]*?)<\/textarea>/gi)) {
    const tag = m[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    const val = m[1];
    if (id) byId.set(id, val);
    if (name) byName.set(name, val);
  }

  const fields = new Map();
  for (const [htmlId, postName] of Object.entries(ID_TO_POST)) {
    const val = byId.get(htmlId) ?? byName.get(postName) ?? byName.get(htmlId);
    if (val !== undefined) fields.set(postName, val);
  }
  for (const [name, val] of byName) {
    if (!fields.has(name)) fields.set(name, val);
  }
  return fields;
}

async function gravarPeca(cookie, fields) {
  const id = fields.get('ID') ?? '';
  if (!id || !/^\d{6,9}$/.test(id)) {
    throw new Error(`gravarPeca bloqueado: ID inválido ("${id}")`);
  }
  const params = new URLSearchParams();
  for (const [k, v] of fields) params.append(k, v);
  const res = await fetch(`${BASE}/cad_peca.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie, 'User-Agent': UA,
      'Referer': `${BASE}/cad_peca.asp`, 'X-Requested-With': 'XMLHttpRequest',
    },
    body: params.toString(),
  });
  return res.text();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Logando no leiloes.br (leilão ${numLeilao})...`);
  const cookie0 = await login();

  console.log('Listando peças do leilão...');
  let pecas = await listarPecas(cookie0);
  console.log(`${pecas.length} peças encontradas.`);
  if (skip) {
    pecas = pecas.slice(skip);
    console.log(`--skip=${skip}: pulando as primeiras ${skip}, restam ${pecas.length}.`);
  }
  if (limit) {
    pecas = pecas.slice(0, limit);
    console.log(`--limit=${limit}: processando só as primeiras ${pecas.length} (após skip).`);
  }
  if (dryRun) console.log('--dry-run: nenhuma gravação será feita, só o mapeamento será mostrado.');

  let ok = 0, jaTinha = 0, semCodigo = 0, erro = 0;

  for (const { pieceId } of pecas) {
    try {
      const html = await loadPecaFormHtml(cookie0, pieceId);
      const fields = extractPecaFields(html);

      const codigo = (fields.get('Descricao_2') || '').trim();
      const descricaoAtual = (fields.get('Descricao') || '').trim();

      if (!codigo) {
        console.log(`  [peça ${pieceId}] sem código na segunda descrição — pulando`);
        semCodigo++;
        continue;
      }

      if (descricaoAtual.startsWith(codigo)) {
        console.log(`  [peça ${pieceId}] já prefixada: "${descricaoAtual}" — pulando`);
        jaTinha++;
        continue;
      }

      const novaDescricao = `${codigo} | ${descricaoAtual}`;
      console.log(`  [peça ${pieceId}] "${descricaoAtual}" → "${novaDescricao}"`);

      if (dryRun) { ok++; continue; }

      fields.set('ID', fields.get('ID') || pieceId);
      fields.set('NumLeilao', numLeilao);
      fields.set('Descricao', novaDescricao);
      fields.set('Botao', 'Gravar');

      const text = await gravarPeca(cookie0, fields);
      if (!text.startsWith('1|')) throw new Error(text.replace(/<[^>]+>/g, '').trim().slice(0, 120));
      ok++;
    } catch (e) {
      console.error(`  [peça ${pieceId}] erro: ${e.message}`);
      erro++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n─── Resumo ───');
  console.log(`OK: ${ok}`);
  console.log(`Já prefixadas (puladas): ${jaTinha}`);
  console.log(`Sem código Pandora: ${semCodigo}`);
  console.log(`Erros: ${erro}`);
}

main().catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
