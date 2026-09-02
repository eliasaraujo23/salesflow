// Script descartável — sobe fotos locais (G:\Grupo Tech\PANDORA\<codigo>\) para as peças
// de um leilão exclusivo Pandora no leiloes.br, casando pelo código Pandora (Descricao_2).
// Roda localmente (não na Vercel) porque precisa acessar o disco G:\ da máquina.
//
// Uso:  node --env-file=.env scripts/pandora-upload-fotos.js 64491
//       node --env-file=.env scripts/pandora-upload-fotos.js 64491 --limit=3   (testa só 3 peças)
//       node --env-file=.env scripts/pandora-upload-fotos.js 64491 --dry-run   (só lista, não sobe nada)
//
// Apagar este arquivo depois de usar (uso único, não faz parte do app).

const fs   = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const BASE   = 'https://www.leiloesbr.com.br/painel_lbr';
const UA     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const PASTA_PANDORA = 'G:\\PANDORA';

const args = process.argv.slice(2);
const numLeilao = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
const skipArg = args.find(a => a.startsWith('--skip='));
const skip = skipArg ? Number(skipArg.split('=')[1]) : 0;
const idsArg = args.find(a => a.startsWith('--ids='));
const onlyIds = idsArg ? new Set(idsArg.split('=')[1].split(',')) : null;

if (!numLeilao) {
  console.error('Uso: node --env-file=.env scripts/pandora-upload-fotos.js <numLeilao> [--limit=N] [--skip=N] [--ids=id1,id2] [--dry-run]');
  process.exit(1);
}

const USER = process.env.LEILOESBR_USER_ETERNNO;
const PASS = process.env.LEILOESBR_PASS_ETERNNO;
if (!USER || !PASS) {
  console.error('Faltam LEILOESBR_USER_ETERNNO / LEILOESBR_PASS_ETERNNO no .env');
  process.exit(1);
}

// ─── Cookies ──────────────────────────────────────────────────────────────────

function mergeCookies(existing, res) {
  const setCookieList = res.headers.getSetCookie?.() ?? [];
  if (setCookieList.length === 0) return existing;
  const map = new Map();
  for (const pair of existing.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) map.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
  for (const header of setCookieList) {
    const kv  = header.split(';')[0].trim();
    const idx = kv.indexOf('=');
    if (idx > 0) map.set(kv.slice(0, idx).trim(), kv.slice(idx + 1).trim());
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

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
    const id  = cells[0]?.trim();
    const lote = cells[1]?.trim();
    if (id && /^\d{6,}$/.test(id)) pecas.push({ pieceId: id, lote: Number(lote) || null });
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

// ─── Imagens locais (pasta G:\Grupo Tech\PANDORA\<codigo>) ───────────────────

// Detecta WEBP pelos magic bytes reais do arquivo — muitas fotos da Pandora vêm
// salvas com extensão .jpg/.png mas conteúdo webp, e o Jimp instalado não decodifica webp.
function isWebpReal(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
}

function listarFotosLocais(codigo) {
  const dir = path.join(PASTA_PANDORA, codigo);
  if (!fs.existsSync(dir)) return null;
  const arquivos = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  return arquivos
    .map(f => path.join(dir, f))
    .filter(p => !isWebpReal(p)); // pula webp real, mesmo com extensão .jpg/.png
}

// Escolhe a principal aleatoriamente e mistura o resto para os extras
function escolherPrincipalEExtras(caminhos) {
  const shuffled = [...caminhos].sort(() => Math.random() - 0.5);
  const [principal, ...resto] = shuffled;
  return { principal, extras: resto.slice(0, 5) };
}

async function processarImagem(filePath) {
  const maxBytes = 1.8 * 1024 * 1024;
  const img = await Jimp.read(filePath);
  img.scaleToFit({ w: 1200, h: 1200 });
  let quality = 90;
  let out;
  do {
    if (quality < 20) throw new Error(`Não foi possível comprimir: ${filePath}`);
    out = await img.getBuffer('image/jpeg', { quality });
    quality -= 10;
  } while (out.byteLength > maxBytes);
  return out;
}

// ─── Upload de fotos no leiloes.br (igual a app/api/leilao/reupload-fotos) ───

async function uploadPrincipal(cookie, pieceId, buf) {
  const fd = new FormData();
  fd.append('IdPeca', pieceId);
  fd.append('NumLeilao', numLeilao);
  fd.append('Siteurl', 'https://www.leiloesbr.com.br/');
  fd.append('Foto', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg');
  const res = await fetch(`${BASE}/img_pecas.php`, {
    method: 'POST',
    headers: { 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
    body: fd, signal: AbortSignal.timeout(60_000),
  });
  const setCookieRaw = res.headers.getSetCookie?.() ?? [];
  const allNewCookies = setCookieRaw.map(c => c.split(';')[0]).join('; ');
  const updatedCookie = allNewCookies ? `${cookie}; ${allNewCookies}` : cookie;
  const text = await res.text();
  if (!res.ok) throw new Error(`principal HTTP ${res.status}: ${text.slice(0, 100)}`);

  const s3Res = await fetch(`${BASE}/ajax/s3enviaimagem.asp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': updatedCookie, 'User-Agent': UA,
      'Referer': `${BASE}/cad_peca.asp`, 'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ idpeca: pieceId, index: '0' }).toString(),
    signal: AbortSignal.timeout(30_000),
  });
  return mergeCookies(updatedCookie, s3Res);
}

async function getAvailableSlots(cookie, pieceId) {
  const res = await fetch(`${BASE}/gerenciar_imagens.asp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookie, 'User-Agent': UA, 'Referer': `${BASE}/listar_pecas.asp` },
    body: new URLSearchParams({ ID: pieceId }).toString(),
  });
  const text = await res.text();
  const updatedCookie = mergeCookies(cookie, res);
  const occupied = new Set();
  for (const m of text.matchAll(/initialPreview(?:Config)?\s*:\s*\[([^\]]*)\]/g)) {
    for (const cap of m[1].matchAll(/"caption"\s*:\s*"[^"]*_(\d+)\.jpg"/g)) {
      const n = parseInt(cap[1]);
      if (n >= 1 && n <= 5) occupied.add(n);
    }
  }
  const slots = [];
  for (let i = 1; i <= 5; i++) if (!occupied.has(i)) slots.push(i);
  return { cookie: updatedCookie, slots };
}

async function uploadExtras(cookie, pieceId, buffers, freeSlots) {
  if (buffers.length === 0) return 0;
  const count = Math.min(buffers.length, freeSlots.length);
  let activeCookie = cookie;
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const slot = freeSlots[i];
    const fd = new FormData();
    fd.append('Foto', new Blob([buffers[i]], { type: 'image/jpeg' }), `extra_${i}.jpg`);
    fd.append('file_id', String(i));
    fd.append('compl', String(slot));
    fd.append('IdPeca', pieceId);
    fd.append('NumLeilao', numLeilao);
    fd.append('Siteurl', 'https://www.leiloesbr.com.br/');
    const res = await fetch(`${BASE}/img_pecas_extras.php`, {
      method: 'POST',
      headers: { 'Cookie': activeCookie, 'User-Agent': UA, 'Referer': `${BASE}/cad_peca.asp` },
      body: fd, signal: AbortSignal.timeout(60_000),
    });
    const setCookieRaw = res.headers.getSetCookie?.() ?? [];
    const allNewCookies = setCookieRaw.map(c => c.split(';')[0]).join('; ');
    const extraCookie = allNewCookies ? `${activeCookie}; ${allNewCookies}` : activeCookie;
    activeCookie = mergeCookies(activeCookie, res);
    const text = await res.text();
    if (res.ok && !text.includes('"error"')) {
      ok++;
      const s3Res = await fetch(`${BASE}/ajax/s3enviaimagem.asp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': extraCookie, 'User-Agent': UA,
          'Referer': `${BASE}/cad_peca.asp`, 'X-Requested-With': 'XMLHttpRequest',
        },
        body: new URLSearchParams({ idpeca: pieceId, index: String(slot) }).toString(),
        signal: AbortSignal.timeout(30_000),
      });
      activeCookie = mergeCookies(extraCookie, s3Res);
    }
    if (i < count - 1) await new Promise(r => setTimeout(r, 300));
  }
  return ok;
}

async function setSite(cookie, pieceId) {
  const html = await loadPecaFormHtml(cookie, pieceId);
  const fields = extractPecaFields(html);
  if (fields.size < 3) throw new Error(`Formulário não carregou (${fields.size} campos)`);
  fields.set('ID', fields.get('ID') || pieceId);
  fields.set('NumLeilao', numLeilao);
  fields.set('Site', '1');
  fields.set('Botao', 'Gravar');
  const text = await gravarPeca(cookie, fields);
  if (!text.startsWith('1|')) throw new Error(text.replace(/<[^>]+>/g, '').trim().slice(0, 120));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Logando no leiloes.br (leilão ${numLeilao})...`);
  const cookie0 = await login();

  console.log('Listando peças do leilão...');
  let pecas = await listarPecas(cookie0);
  console.log(`${pecas.length} peças encontradas.`);
  if (onlyIds) {
    pecas = pecas.filter(p => onlyIds.has(p.pieceId));
    console.log(`--ids: filtrando só ${pecas.length} peça(s) específica(s).`);
  }
  if (skip) {
    pecas = pecas.slice(skip);
    console.log(`--skip=${skip}: pulando as primeiras ${skip}, restam ${pecas.length}.`);
  }
  if (limit) {
    pecas = pecas.slice(0, limit);
    console.log(`--limit=${limit}: processando só as primeiras ${pecas.length} (após skip).`);
  }
  if (dryRun) console.log('--dry-run: nenhuma foto será enviada, só o mapeamento será mostrado.');

  let semCodigo = 0, semPasta = 0, semFoto = 0, ok = 0, erro = 0;

  for (const peca of pecas) {
    const { pieceId, lote } = peca;
    try {
      const html = await loadPecaFormHtml(cookie0, pieceId);
      const fields = extractPecaFields(html);
      const descricao2 = (fields.get('Descricao_2') || '').trim();
      // Descricao_2 pode vir como "190017C01-2/50" (variação/duplicata) — a pasta de
      // fotos usa só o código base, antes do primeiro '-' ou '/'.
      const codigoPandora = descricao2.split(/[-/]/)[0].trim();

      if (!codigoPandora) {
        console.log(`  [peça ${pieceId}] sem código Pandora na segunda descrição — pulando`);
        semCodigo++;
        continue;
      }

      const fotos = listarFotosLocais(codigoPandora);
      if (!fotos) {
        console.log(`  [peça ${pieceId}] código ${codigoPandora} (bruto: "${descricao2}") — pasta não encontrada em ${PASTA_PANDORA}`);
        semPasta++;
        continue;
      }
      if (fotos.length === 0) {
        console.log(`  [peça ${pieceId}] código ${codigoPandora} — pasta vazia`);
        semFoto++;
        continue;
      }

      const { principal, extras } = escolherPrincipalEExtras(fotos);
      console.log(`  [peça ${pieceId}] código ${codigoPandora} — ${fotos.length} foto(s), principal=${path.basename(principal)}`);

      if (dryRun) { ok++; continue; }

      let cookie = cookie0;
      try {
        const bufPrincipal = await processarImagem(principal);
        cookie = await uploadPrincipal(cookie, pieceId, bufPrincipal);
      } catch (e) {
        console.error(`    erro na foto principal: ${e.message}`);
        erro++;
        continue;
      }

      if (extras.length > 0) {
        try {
          const { cookie: c2, slots } = await getAvailableSlots(cookie, pieceId);
          cookie = c2;
          if (slots.length > 0) {
            const buffers = [];
            for (const f of extras) buffers.push(await processarImagem(f));
            const nOk = await uploadExtras(cookie, pieceId, buffers, slots);
            console.log(`    ${nOk} extra(s) enviada(s)`);
          }
        } catch (e) {
          console.error(`    erro nas extras: ${e.message}`);
        }
      }

      try {
        await setSite(cookie, pieceId);
        console.log(`    Site ativado`);
      } catch (e) {
        console.error(`    erro ao ativar Site: ${e.message}`);
      }

      ok++;
    } catch (e) {
      console.error(`  [peça ${pieceId}] erro geral: ${e.message}`);
      erro++;
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n─── Resumo ───');
  console.log(`OK: ${ok}`);
  console.log(`Sem código Pandora: ${semCodigo}`);
  console.log(`Sem pasta local: ${semPasta}`);
  console.log(`Pasta vazia: ${semFoto}`);
  console.log(`Erros: ${erro}`);
}

main().catch(e => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
