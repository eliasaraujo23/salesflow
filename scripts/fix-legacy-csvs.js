// Gera versões corrigidas dos CSVs históricos (avaliadores padronizados,
// feedback normalizado, razão social e tipo com texto completo) e sobrescreve
// os arquivos originais em G:\USUÁRIOS\ELIAS\LOJASFLOW\.
// Não mexe em ETN.csv (fora de escopo — não é loja cadastrada hoje).
const fs = require('fs');

const DIR = 'G:\\USUÁRIOS\\ELIAS\\LOJASFLOW';
const ARQUIVOS = ['GTT', 'GTI', '24K', 'PCI', 'PGT', 'PTQ'];

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

function csvEscape(v) {
  const s = v ?? '';
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// --- Mesmos mapeamentos validados no script de migração ---
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
};

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

function fixRazaoSocial(v) {
  const clean = (v || '').trim();
  if (!clean) return clean;
  for (const [prefix, full] of RAZAO_SOCIAL_MAP) {
    if (clean.startsWith(prefix) || clean === prefix) return full;
  }
  return clean; // sem match — mantém original
}

function fixTipo(v) {
  const clean = (v || '').trim();
  if (!clean) return clean;
  const upper = clean.toUpperCase();
  if (upper.startsWith('FUNDI')) return 'FUNDIÇÃO';
  if (upper === 'REVENDA') return 'REVENDA';
  return clean;
}

function fixAvaliador(v) {
  const clean = (v || '').trim();
  if (!clean) return clean;
  return AVALIADOR_MAP[clean] ?? clean;
}

function fixFeedback(v) {
  const clean = (v || '').trim();
  if (clean === 'i') return 'I';
  if (clean === 'l') return 'L';
  if (clean === 'sf' || clean === 'S/F' || clean === 'S-F') return 'SF';
  if (clean === 'r') return 'R';
  return clean;
}

function fixTransacao(v) {
  const clean = (v || '').trim().toUpperCase();
  if (clean === 'COMPRA') return 'COMPRA';
  if (clean.includes('NAO') || clean.includes('NÃO') || clean.includes('N?O')) return 'NÃO COMPRA';
  return (v || '').trim();
}

function fixLoja(original, code) {
  return code; // já corrigido manualmente pelo usuário no Access antes desta rodada
}

function fixFile(code) {
  const filePath = `${DIR}\\${code}.csv`;
  const buf = fs.readFileSync(filePath);
  const text = decodeBuffer(buf);
  const rows = parseCsv(text);
  const header = rows[0];
  const idx = name => header.indexOf(name);

  const iFeedback = idx('FEEDBACK'), iTransacao = idx('TRANSACAO'), iLoja = idx('LOJA'),
        iAv1 = idx('AV1'), iAv2 = idx('AV2'), iAv3 = idx('AV3'), iAv4 = idx('AV4'),
        iAvaliador = idx('AVALIADOR'), iRazao = idx('RAZÃO SOCIAL'), iTipo = idx('TIPO');

  let changed = 0;
  const outRows = [header];
  for (const r of rows.slice(1)) {
    if (r.length !== header.length) { outRows.push(r); continue; } // preserva linhas malformadas como estão
    const row = [...r];

    const newFeedback = fixFeedback(row[iFeedback]);
    if (newFeedback !== row[iFeedback]) { row[iFeedback] = newFeedback; changed++; }

    const newTransacao = fixTransacao(row[iTransacao]);
    if (newTransacao !== row[iTransacao]) { row[iTransacao] = newTransacao; changed++; }

    for (const i of [iAv1, iAv2, iAv3, iAv4, iAvaliador]) {
      const newVal = fixAvaliador(row[i]);
      if (newVal !== row[i]) { row[i] = newVal; changed++; }
    }

    const newRazao = fixRazaoSocial(row[iRazao]);
    if (newRazao !== row[iRazao]) { row[iRazao] = newRazao; changed++; }

    const newTipo = fixTipo(row[iTipo]);
    if (newTipo !== row[iTipo]) { row[iTipo] = newTipo; changed++; }

    outRows.push(row);
  }

  const outText = outRows.map(r => r.map(csvEscape).join(';')).join('\r\n') + '\r\n';
  fs.writeFileSync(filePath, Buffer.from('\uFEFF' + outText, 'utf8')); // BOM UTF-8 pra abrir certo no Excel/Access
  console.log(`${code}.csv: ${changed} campos corrigidos em ${outRows.length - 1} linhas`);
}

for (const f of ARQUIVOS) {
  fixFile(f);
}
console.log('Concluído. ETN.csv não foi alterado (fora de escopo).');
