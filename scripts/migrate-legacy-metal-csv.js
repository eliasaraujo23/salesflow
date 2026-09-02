// Migra o histórico real de avaliação de metal (Access legado) dos CSVs em
// G:\USUÁRIOS\ELIAS\LOJASFLOW\ para a tabela `metal` do Postgres (Neon).
// Escopo: GTT, GTI, 24K, PCI(ci), PGT(pgt), PTQ(ptq). ETN fica de fora
// (não é uma loja cadastrada em lib/controle-config.ts hoje).
require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const DIR = 'G:\\USUÁRIOS\\ELIAS\\LOJASFLOW';

const ARQUIVOS = [
  { file: 'GTT', loja: 'gtt' },
  { file: 'GTI', loja: 'gti' },
  { file: '24K', loja: '24k' },
  { file: 'PCI', loja: 'ci' },
  { file: 'PGT', loja: 'pgt' },
  { file: 'PTQ', loja: 'ptq' },
];

function decodeBuffer(buf) {
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) return buf.slice(3).toString('utf8');
  const utf8 = buf.toString('utf8');
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  return replacementCount > 5 ? buf.toString('latin1') : utf8;
}

function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ';') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function slugify(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseNum(s) {
  if (!s) return 0;
  const clean = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function parseMoeda(s) {
  if (!s) return 0;
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function parseDataISO(s) {
  const m = (s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
}

function parseHora(s) {
  const t = (s || '').trim();
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '00:00';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

// --- Mapeamento de avaliadores (nome do CSV -> nome cadastrado) ---
const AVALIADOR_MAP = {
  'Daiana Lourdes': 'Daiana de Lourdes',
  'Daiana': 'Daiana de Lourdes',
  'Andressa Souza': 'Andressa Sousa',
  'Andressa': 'Andressa Sousa',
  'Juliana': 'Juliana Araújo',
  'Julia': 'Juliana Araújo',
  'Luciana': 'Luciana Vidal',
  'Nicole': 'Nicolle Jannuzzi',
  'Nicole Januzzi': 'Nicolle Jannuzzi',
  'Eduardo': 'Eduardo Carvalho',
  'Fernanda Melo': 'Fernanda Mello',
  'Helton': 'Helton Santana',
  'Helton Almeida': 'Helton Santana',
  'Larissa': 'Larissa Vargas',
  'Clara': 'Ana Clara',
  'Clarisse': 'Clarisse Santana',
  'Thays': 'Thays Pinheiro',
  'Thais': 'Thaís Araújo',
  'Thaís': 'Thaís Araújo',
  'Giovanna': 'Giovanna Silva',
  'Paula': 'Paula Nascimento',
  'Elias': 'Waleska Aires',
  'Catarina Quaresma': 'Catarina Quaresma',
  'Palmira Almeida': 'Palmira Almeida',
  'Henrique Carvalho': 'Henrique Carvalho',
};

// --- Mapeamento de razão social (prefixo do CSV -> nome completo cadastrado) ---
const RAZAO_SOCIAL_MAP = [
  ['G. Tech', 'G. Tech Comércio de Joias LTDA'],
  ['Gold Tech (Tijuca)', 'Gold Tech Comércio de Joias LTDA'],
  ['Gold Tech', 'Gold Tech Comércio de Joias LTDA'],
  ['H. Tech', 'H. Tech Comércio De Joias LTDA'],
  ['A. Tech', 'A. Tech Comércio De Joias LTDA'],
  ['Tech Gold', 'Tech Gold Ipanema Comércio de Joias LTDA'],
  ['24K Múier', '24K Joias | Thais Joias LTDA'],
  ['24K Méier', '24K Joias | Thais Joias LTDA'],
  ['24K MEIER', '24K Joias | Thais Joias LTDA'],
  ['24K Joias', '24K Joias | Thais Joias LTDA'],
];

function mapRazaoSocial(v) {
  const clean = (v || '').trim();
  if (!clean) return null;
  for (const [prefix, full] of RAZAO_SOCIAL_MAP) {
    if (clean.startsWith(prefix) || clean === prefix) return slugify(full);
  }
  return null; // órfão sem match — fica sem empresa vinculada
}

function mapTipo(v) {
  const clean = v.trim().toUpperCase();
  if (!clean) return null;
  if (clean.startsWith('FUNDI')) return 'fundicao'; // cobre FUNDIÇÃO/JRCP, FUNDIÃ?O/JRCP, FUNDIÇÃO
  if (clean === 'REVENDA') return 'revenda';
  const KNOWN = { '24K': '24k', 'ANTIGO': 'antigo', 'ETN': 'etn', 'GTI': 'gti', 'GTT': 'gtt', 'SCRAP': 'scrap', 'SECOND HAND': 'second-hand' };
  return KNOWN[clean] ?? null;
}

function mapFeedback(v, lojaCode) {
  const clean = v.trim();
  if (!clean) return null;
  if (clean === 'i') return 'I';
  if (clean === 'l') return 'L';
  if (clean === 'sf' || clean === 'S/F' || clean === 'S-F') return 'SF';
  if (clean === 'r') return 'R';
  return clean; // resolve na hora da query (só entra se existir na tabela)
}

async function migrateFile(client, avaliadorByName, feedbacksByLoja, { file, loja }) {
  const buf = fs.readFileSync(`${DIR}\\${file}.csv`);
  const rows = parseCsv(decodeBuffer(buf));
  const header = rows[0];
  const idx = name => header.findIndex(h => h.trim() === name);

  const iCod = idx('COD INTERNO'), iData = idx('DATA'), iHora = idx('HORA'),
        iFeedback = idx('FEEDBACK'), iPreco = idx('PRECO'), iMotivoNc = idx('MOTIVO NC'),
        iTransacao = idx('TRANSACAO'), iCpf = idx('CPF'), iNome = idx('NOME'),
        iRazao = idx('RAZÃO SOCIAL'), iTipo = idx('TIPO'), iObs = idx('OBSERVACAO'),
        iAv1 = idx('AV1'), iAv2 = idx('AV2'), iAv3 = idx('AV3'), iAv4 = idx('AV4');
  const qIdx = { ouro_24k: idx('24K'), ouro_22k: idx('22K'), pt: idx('PT'), ouro_750: idx('750'), ouro_720: idx('720'), bx: idx('BX'), platina: idx('PLATINA'), prata: idx('PRATA') };
  const iValor = idx('VALOR GASTO/OFERTA'), iPago = idx('PAGO POR GRAMA');

  const data = rows.slice(1).filter(r => r.length === header.length);
  const feedbackSet = feedbacksByLoja.get(loja) ?? new Set();

  function resolveAvaliador(nome) {
    const clean = (nome || '').trim();
    if (!clean) return null;
    const mapped = AVALIADOR_MAP[clean] ?? clean;
    return avaliadorByName.get(mapped) ?? null;
  }

  function resolveFeedback(nome) {
    const mapped = mapFeedback(nome, loja);
    if (!mapped) return null;
    return feedbackSet.has(mapped) ? mapped : null;
  }

  const DRY_RUN = process.argv.includes('--dry-run');
  let inserted = 0, skipped = 0, semAvaliador = 0, semFeedback = 0, semFeedbackNc = 0,
      semModalidade = 0, semEmpresa = 0, comAvaliadorTotal = 0;
  const batch = [];
  const BATCH_SIZE = 200;

  async function flushBatch() {
    if (batch.length === 0) return;
    const cols = [
      'id', 'loja', 'cod_interno', 'data', 'hora', 'datetime', 'avaliadores', 'nome', 'cpf', 'transacao',
      'feedback_id', 'feedback_nc_id', 'modalidade_id', 'empresa_id',
      'ouro_24k', 'ouro_22k', 'pt', 'ouro_750', 'ouro_720', 'bx', 'platina', 'prata',
      'total_peso', 'preco', 'valor', 'pago_por_grama', 'observacao',
    ];
    const valuesSql = batch
      .map((row, i) => `(${cols.map((_, j) => `$${i * cols.length + j + 1}`).join(',')})`)
      .join(',');
    const params = batch.flat();
    try {
      const result = await client.query(
        `INSERT INTO metal (${cols.join(', ')}) VALUES ${valuesSql} ON CONFLICT (id) DO NOTHING`,
        params
      );
      inserted += result.rowCount ?? 0;
    } catch (err) {
      console.error(`Erro ao inserir lote (${loja}):`, err.message);
      skipped += batch.length;
    }
    batch.length = 0;
  }

  for (const r of data) {
    const dataISO = parseDataISO(r[iData]);
    if (!dataISO) { skipped++; continue; }

    const transacaoRaw = (r[iTransacao] || '').trim().toUpperCase();
    const isCompra = transacaoRaw === 'COMPRA';
    const isNaoCompra = transacaoRaw.includes('NAO') || transacaoRaw.includes('NÃO') || transacaoRaw.includes('N?O');
    if (!isCompra && !isNaoCompra) { skipped++; continue; } // transacao vazia/inválida

    const transacao = isCompra ? 'COMPRA' : 'NAO_COMPRA';
    const hora = parseHora(r[iHora]);
    const datetime = `${dataISO}T${hora}:00`;

    const av1Raw = (r[iAv1] || '').trim();
    const avaliadores = [r[iAv1], r[iAv2], r[iAv3], r[iAv4]]
      .map(resolveAvaliador)
      .filter(Boolean);
    if (av1Raw && avaliadores.length === 0) semAvaliador++;
    if (avaliadores.length > 0) comAvaliadorTotal++;

    const feedbackRaw = (r[iFeedback] || '').trim();
    const feedbackId = resolveFeedback(r[iFeedback]);
    if (feedbackRaw && !feedbackId) semFeedback++;

    const motivoNcRaw = (r[iMotivoNc] || '').trim();
    const feedbackNcId = !isCompra && /^([1-9]|1[01])$/.test(motivoNcRaw) ? motivoNcRaw : null;
    if (!isCompra && motivoNcRaw && !feedbackNcId) semFeedbackNc++;

    const precoRaw = (r[iPreco] || '').trim();
    const preco = /^[1-5]$/.test(precoRaw) ? Number(precoRaw) : 1;

    const modalidadeId = mapTipo(r[iTipo]);
    const empresaId = mapRazaoSocial(r[iRazao]);
    const tipoRaw = (r[iTipo] || '').trim();
    const razaoRaw = (r[iRazao] || '').trim();
    if (tipoRaw && !modalidadeId) semModalidade++;
    if (razaoRaw && !empresaId) semEmpresa++;

    const pesos = {};
    for (const [key, i] of Object.entries(qIdx)) pesos[key] = parseNum(r[i]);
    const totalPeso = Object.values(pesos).reduce((s, v) => s + v, 0);

    const valor = parseMoeda(r[iValor]);
    const pagoPorGrama = totalPeso > 0 ? valor / totalPeso : 0;

    const cpf = (r[iCpf] || '').trim();
    const nome = (r[iNome] || '').trim();
    const observacao = (r[iObs] || '').trim();
    const codInterno = (r[iCod] || '').trim();
    if (!codInterno) { skipped++; continue; }

    const id = `legacy_${loja}_${codInterno}`;

    if (DRY_RUN) {
      inserted++;
      continue;
    }

    batch.push([
      id, loja, codInterno, dataISO, hora, datetime, avaliadores, nome, cpf, transacao,
      feedbackId, feedbackNcId, modalidadeId, empresaId,
      pesos.ouro_24k, pesos.ouro_22k, pesos.pt, pesos.ouro_750, pesos.ouro_720,
      pesos.bx, pesos.platina, pesos.prata,
      totalPeso, preco, valor, pagoPorGrama, observacao,
    ]);

    if (batch.length >= BATCH_SIZE) await flushBatch();
  }

  await flushBatch();

  console.log(`${file} -> loja ${loja}: ${inserted} ${DRY_RUN ? 'seriam inseridos' : 'inseridos'}, ${skipped} pulados (de ${data.length} linhas)`);
  console.log(`  sem avaliador: ${semAvaliador} | sem feedback: ${semFeedback} | sem motivo_nc: ${semFeedbackNc} | sem modalidade: ${semModalidade} | sem empresa: ${semEmpresa} | com avaliador: ${comAvaliadorTotal}`);
}

async function main() {
  const client = new Client({ connectionString: process.env.CONTROLE_LOJAS_DATABASE_URL });
  await client.connect();

  const avaliadoresRes = await client.query('SELECT nome FROM avaliadores');
  const avaliadorByName = new Map(avaliadoresRes.rows.map(r => [r.nome, slugify(r.nome)]));

  const feedbacksRes = await client.query('SELECT loja, id FROM feedbacks_compra');
  const feedbacksByLoja = new Map();
  for (const r of feedbacksRes.rows) {
    if (!feedbacksByLoja.has(r.loja)) feedbacksByLoja.set(r.loja, new Set());
    feedbacksByLoja.get(r.loja).add(r.id);
  }

  for (const arq of ARQUIVOS) {
    await migrateFile(client, avaliadorByName, feedbacksByLoja, arq);
  }

  await client.end();
  console.log('Migração concluída.');
}

main().catch(err => { console.error(err); process.exit(1); });
