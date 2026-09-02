// Investigação read-only dos CSVs históricos do Access legado.
// Não escreve nada — só lê e reporta.
const fs = require('fs');
const path = require('path');

const DIR = 'G:\\USUÁRIOS\\ELIAS\\LOJASFLOW';
const FILES = ['GTT', 'GTI', '24K', 'PCI', 'PGT', 'PTQ', 'ETN'];

// Parser CSV simples com suporte a aspas (RFC4180-ish), separador ';'
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
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

function decodeBuffer(buf) {
  // Detecta BOM UTF-8
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3).toString('utf8');
  }
  // Tenta UTF-8; se tiver replacement chars em excesso, tenta latin1
  const utf8 = buf.toString('utf8');
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount > 5) {
    return buf.toString('latin1');
  }
  return utf8;
}

function countBy(arr) {
  const map = new Map();
  for (const v of arr) map.set(v, (map.get(v) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

const HEADER_EXPECTED = ['ID','LINHA','COD INTERNO','DATA','HORA','FEEDBACK','PRECO','MOTIVO NC','TRANSACAO','24K','22K','PT','750','720','BX','PLATINA','PRATA','PESO TOTAL','VALOR GASTO/OFERTA','PAGO POR GRAMA','OBSERVACAO','LOJA','AVALIADOR','AV1','AV2','AV3','AV4','CPF','NOME','ID ALTERNATIVO','RAZÃO SOCIAL','TIPO','CONFERÊNCIA','ENVIO'];

const KNOWN_FEEDBACK = {
  GTT: ['45','AK','BF','BLF','BM','BE','BP','BU','C','COC','CP','BC','G','I','ICB','ICB2','IE','IG','L','LG','LT','MFL','MG','MPC','MPC2','MP','MV','NSD','O','P','P215','PC','PDP','PLM','PP','R','SF','SM','Tx'],
  '24K': ['AC','BA','BC','BCP','BE','BF','BG','BP','BPP','CP','EXP','F','G','GT','HA','I','JMH','L','MI','ND','O','OX','P','PC','PR','R','SF','SM','V'],
  GTI: ['M','H','MH','V','R','BH','BP','BBB','BO','I','COM','SF','ND','P','L','ZS','FX','C','CV','G','DM','B3B','A','T','HS','P2','S','550'],
  PCI: ['L','I','EZ','G','R','P','EL','SM'],
  PTQ: ['ES','G','I','L','PA','P','PO','R'],
  PGT: ['L','I','PA','G','R','P','AM','IT','B','OT','ST','RS','DIBA'],
};

const KNOWN_AVALIADORES = ['Aline Sousa','Ana Clara','Ana Paula','Andressa Sousa','Augusto Carvalho','Brenda Carvalho','Bruno Araújo','Caroline Oliveira','Clarisse Santana','Daiana de Lourdes','Eduardo Carvalho','Fernanda Mello','Francesco Araújo','Giovanna Silva','Helton Santana','Joyce Bittencourt','Juliana Araújo','Larissa Vargas','Luciana Vidal','Matheus Souza','Nicolle Jannuzzi','Paula Nascimento','Rafaela Deboson','Raphael Borges','Thays Pinheiro','Thaís Almeida','Thaís Araújo','Vinicius de Paula','Waleska Aires'];

const KNOWN_EMPRESAS = ['24K Joias | Thais Joias LTDA','A. Tech Comércio De Joias LTDA','ETERNNO Comércio de Jóias e Artigos de Luxo LTDA','G. Tech Comércio de Joias LTDA','Gold Tech Comércio de Joias LTDA','H. Tech Comércio De Joias LTDA','Tech Gold Ipanema Comércio de Joias LTDA'];

const KNOWN_TIPOS = ['24K','ANTIGO','ETN','GTI','GTT','SCRAP','SECOND HAND'];

function idx(name) { return HEADER_EXPECTED.indexOf(name); }

function analyzeFile(code) {
  const filePath = path.join(DIR, `${code}.csv`);
  const buf = fs.readFileSync(filePath);
  const text = decodeBuffer(buf);
  const rows = parseCsv(text);
  const header = rows[0];
  const data = rows.slice(1).filter(r => r.length > 1 || (r[0] && r[0].trim() !== ''));

  console.log(`\n========== ${code} ==========`);
  console.log(`Linhas de dado: ${data.length}`);
  console.log(`Colunas no header: ${header.length} (esperado: ${HEADER_EXPECTED.length})`);
  const headerMismatch = header.length !== HEADER_EXPECTED.length;
  if (headerMismatch) console.log('  ATENÇÃO: número de colunas do header difere do esperado!');

  const iLoja = idx('LOJA'), iFeedback = idx('FEEDBACK'), iMotivo = idx('MOTIVO NC'),
        iPreco = idx('PRECO'), iTransacao = idx('TRANSACAO'), iAv1 = idx('AV1'), iAv2 = idx('AV2'),
        iAv3 = idx('AV3'), iAv4 = idx('AV4'), iAvaliador = idx('AVALIADOR'), iRazao = idx('RAZÃO SOCIAL'),
        iTipo = idx('TIPO'), iData = idx('DATA'), iHora = idx('HORA'), iCod = idx('COD INTERNO'),
        iCpf = idx('CPF'), iPesoTotal = idx('PESO TOTAL');
  const qCols = ['24K','22K','PT','750','720','BX','PLATINA','PRATA'].map(idx);

  // Linhas com número de campos diferente do header (indica ; dentro de texto sem aspas)
  const malformed = data.filter(r => r.length !== header.length);
  console.log(`Linhas com número de campos != header: ${malformed.length}`);
  if (malformed.length > 0) {
    console.log('  Exemplos (até 3):');
    malformed.slice(0, 3).forEach(r => console.log('   ', JSON.stringify(r.slice(0, 10))));
  }

  // Filtra linhas "bem formadas" pra análise mais confiável
  const good = data.filter(r => r.length === header.length);

  // LOJA
  const lojaVals = countBy(good.map(r => (r[iLoja] || '').trim()));
  console.log(`LOJA distintos: ${JSON.stringify(lojaVals.slice(0, 5))}`);

  // Linhas totalmente vazias (todos campos vazios ou só ID/LINHA)
  const totalEmpty = good.filter(r => r.slice(2).every(v => !v || !v.trim())).length;
  console.log(`Linhas com todos os campos (exceto ID/LINHA) vazios: ${totalEmpty}`);

  // FEEDBACK
  if (KNOWN_FEEDBACK[code]) {
    const known = new Set(KNOWN_FEEDBACK[code]);
    const fbVals = countBy(good.map(r => (r[iFeedback] || '').trim()).filter(v => v));
    const orphans = fbVals.filter(([v]) => !known.has(v));
    console.log(`FEEDBACK: ${fbVals.length} valores distintos, ${orphans.length} órfãos (não cadastrados)`);
    if (orphans.length) console.log('  Órfãos:', JSON.stringify(orphans.slice(0, 30)));
  }

  // MOTIVO NC
  const motivoVals = countBy(good.map(r => (r[iMotivo] || '').trim()));
  console.log(`MOTIVO NC distintos: ${JSON.stringify(motivoVals)}`);
  const motivoOutOfRange = motivoVals.filter(([v]) => v && !/^([1-9]|1[01])$/.test(v));
  if (motivoOutOfRange.length) console.log('  Fora do intervalo 1-11:', JSON.stringify(motivoOutOfRange));

  // PRECO
  const precoVals = countBy(good.map(r => (r[iPreco] || '').trim()));
  console.log(`PRECO distintos: ${JSON.stringify(precoVals.slice(0, 15))}`);
  const precoInvalid = precoVals.filter(([v]) => !/^[1-5]$/.test(v));
  if (precoInvalid.length) console.log('  PRECO inválido/fora de 1-5:', JSON.stringify(precoInvalid.slice(0, 15)));

  // TRANSACAO
  const transVals = countBy(good.map(r => (r[iTransacao] || '').trim()));
  console.log(`TRANSACAO distintos: ${JSON.stringify(transVals)}`);

  // AVALIADORES (AV1-4)
  const knownAv = new Set(KNOWN_AVALIADORES);
  const avAll = [];
  for (const r of good) {
    for (const i of [iAv1, iAv2, iAv3, iAv4]) {
      const v = (r[i] || '').trim();
      if (v) avAll.push(v);
    }
  }
  const avVals = countBy(avAll);
  const avOrphans = avVals.filter(([v]) => !knownAv.has(v));
  console.log(`AV1-4: ${avVals.length} nomes distintos, ${avOrphans.length} órfãos`);
  if (avOrphans.length) console.log('  Órfãos:', JSON.stringify(avOrphans.slice(0, 30)));

  // AVALIADOR vs AV1
  let avaliadorDiffAv1 = 0;
  for (const r of good) {
    const avaliador = (r[iAvaliador] || '').trim();
    const av1 = (r[iAv1] || '').trim();
    if (avaliador && av1 && avaliador !== av1) avaliadorDiffAv1++;
  }
  console.log(`Linhas onde AVALIADOR != AV1: ${avaliadorDiffAv1}`);

  // RAZÃO SOCIAL
  const knownEmp = new Set(KNOWN_EMPRESAS);
  const razaoVals = countBy(good.map(r => (r[iRazao] || '').trim()).filter(v => v));
  const razaoOrphans = razaoVals.filter(([v]) => !knownEmp.has(v));
  console.log(`RAZÃO SOCIAL: ${razaoVals.length} distintos, ${razaoOrphans.length} órfãos`);
  if (razaoOrphans.length) console.log('  Órfãos:', JSON.stringify(razaoOrphans.slice(0, 15)));

  // TIPO
  const knownTipo = new Set(KNOWN_TIPOS);
  const tipoVals = countBy(good.map(r => (r[iTipo] || '').trim()).filter(v => v));
  const tipoOrphans = tipoVals.filter(([v]) => !knownTipo.has(v));
  console.log(`TIPO: ${tipoVals.length} distintos, ${tipoOrphans.length} órfãos`);
  if (tipoOrphans.length) console.log('  Órfãos:', JSON.stringify(tipoOrphans.slice(0, 15)));

  // DATA range
  const dates = good.map(r => (r[iData] || '').trim()).filter(v => v);
  const parsedDates = dates.map(d => {
    const m = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
  });
  const validDates = parsedDates.filter(Boolean);
  const invalidDateCount = dates.length - validDates.length;
  if (validDates.length) {
    const min = new Date(Math.min(...validDates));
    const max = new Date(Math.max(...validDates));
    console.log(`DATA: range ${min.toISOString().slice(0,10)} a ${max.toISOString().slice(0,10)}, ${invalidDateCount} inválidas/vazias de ${good.length}`);
  } else {
    console.log(`DATA: nenhuma data válida encontrada`);
  }

  // COD INTERNO duplicados
  const codVals = good.map(r => (r[iCod] || '').trim()).filter(v => v);
  const codCounts = countBy(codVals);
  const codDupes = codCounts.filter(([, n]) => n > 1);
  console.log(`COD INTERNO duplicados: ${codDupes.length}`);
  if (codDupes.length) console.log('  Exemplos:', JSON.stringify(codDupes.slice(0, 10)));

  // PESO TOTAL vs soma das qualidades
  function parseNum(s) {
    if (!s) return 0;
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  let pesoMismatch = 0;
  for (const r of good) {
    const soma = qCols.reduce((s, i) => s + parseNum(r[i]), 0);
    const total = parseNum(r[iPesoTotal]);
    if (Math.abs(soma - total) > 0.01) pesoMismatch++;
  }
  console.log(`Linhas com PESO TOTAL != soma das qualidades (diff > 0.01): ${pesoMismatch}`);

  // CPF vazio
  const cpfEmpty = good.filter(r => !(r[iCpf] || '').trim()).length;
  console.log(`CPF vazio: ${cpfEmpty} de ${good.length}`);

  return { code, totalRows: good.length, malformed: malformed.length };
}

for (const f of FILES) {
  try {
    analyzeFile(f);
  } catch (err) {
    console.log(`\n========== ${f}: ERRO ==========`);
    console.log(err.message);
  }
}
