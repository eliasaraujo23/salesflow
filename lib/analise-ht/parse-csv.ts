// Parser do CSV "Planilha HT" (AAAAMM_LOJA.csv). Usa separador ';' e respeita
// aspas com quebras de linha internas (a coluna OBSERVACAO às vezes contém \n).
// Só extrai as 21 colunas úteis (LINHA..AVALIADOR) — ver AGENTS.md seção 6
// para as regras de negócio que consomem estes campos.

export interface AnaliseHtRow {
  linha: number | null;
  codInterno: string;
  data: string;
  hora: string;
  feedback: string;
  preco: string;
  motivoNc: string;
  transacao: string;
  ouro24k: number;
  ouro22k: number;
  pt: number;
  ouro750: number;
  ouro720: number;
  bx: number;
  platina: number;
  prata: number;
  pesoTotal: number;
  valorGasto: number;
  pagoPorGrama: number;
  observacao: string;
  loja: string;
  avaliador: string;
}

const EXPECTED_HEADERS = [
  'LINHA', 'COD INTERNO', 'DATA', 'HORA', 'FEEDBACK', 'PRECO', 'MOTIVO NC',
  'TRANSACAO', '24K', '22K', 'PT', '750', '720', 'BX', 'PLATINA', 'PRATA',
  'PESO TOTAL', 'VALOR GASTO/OFERTA', 'PAGO POR GRAMA', 'OBSERVACAO', 'LOJA', 'AVALIADOR',
];

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const clean = text.replace(/^﻿/, '');

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
      continue;
    }

    if (ch === '"') { inQuotes = true; }
    else if (ch === ';') { row.push(field); field = ''; }
    else if (ch === '\r') { /* skip, \n handles the break */ }
    else if (ch === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else { field += ch; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter(r => r.some(f => f.trim() !== ''));
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // remove acentos: PREÇO -> PRECO
}

function parseNumeroBr(raw: string): number {
  const cleaned = raw.trim().replace(/^R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export interface ParseResult {
  rows: AnaliseHtRow[];
  errors: string[];
}

export function parseAnaliseHtCsv(text: string): ParseResult {
  const rawRows = parseRows(text);
  if (rawRows.length < 2) return { rows: [], errors: ['Arquivo vazio ou sem cabeçalho.'] };

  const header = rawRows[0].map(normalizeHeader);
  const idx = (name: string) => header.indexOf(name);

  const col = {
    linha: idx('LINHA'),
    codInterno: idx('COD INTERNO'),
    data: idx('DATA'),
    hora: idx('HORA'),
    feedback: idx('FEEDBACK'),
    preco: idx('PRECO'),
    motivoNc: idx('MOTIVO NC'),
    transacao: idx('TRANSACAO'),
    ouro24k: idx('24K'),
    ouro22k: idx('22K'),
    pt: idx('PT'),
    ouro750: idx('750'),
    ouro720: idx('720'),
    bx: idx('BX'),
    platina: idx('PLATINA'),
    prata: idx('PRATA'),
    pesoTotal: idx('PESO TOTAL'),
    valorGasto: idx('VALOR GASTO/OFERTA'),
    pagoPorGrama: idx('PAGO POR GRAMA'),
    observacao: idx('OBSERVACAO'),
    loja: idx('LOJA'),
    avaliador: idx('AVALIADOR'),
  };

  const missing = EXPECTED_HEADERS.filter(h => !header.includes(normalizeHeader(h)));
  const errors: string[] = [];
  if (missing.length > 0) errors.push(`Colunas ausentes no CSV: ${missing.join(', ')}`);

  const get = (cols: string[], i: number) => (i >= 0 ? (cols[i] ?? '').trim() : '');

  const rows: AnaliseHtRow[] = rawRows.slice(1).map(cols => ({
    linha: col.linha >= 0 ? (parseInt(get(cols, col.linha), 10) || null) : null,
    codInterno: get(cols, col.codInterno),
    data: get(cols, col.data),
    hora: get(cols, col.hora),
    feedback: get(cols, col.feedback),
    preco: get(cols, col.preco),
    motivoNc: get(cols, col.motivoNc),
    transacao: get(cols, col.transacao),
    ouro24k: parseNumeroBr(get(cols, col.ouro24k)),
    ouro22k: parseNumeroBr(get(cols, col.ouro22k)),
    pt: parseNumeroBr(get(cols, col.pt)),
    ouro750: parseNumeroBr(get(cols, col.ouro750)),
    ouro720: parseNumeroBr(get(cols, col.ouro720)),
    bx: parseNumeroBr(get(cols, col.bx)),
    platina: parseNumeroBr(get(cols, col.platina)),
    prata: parseNumeroBr(get(cols, col.prata)),
    pesoTotal: parseNumeroBr(get(cols, col.pesoTotal)),
    valorGasto: parseNumeroBr(get(cols, col.valorGasto)),
    pagoPorGrama: parseNumeroBr(get(cols, col.pagoPorGrama)),
    observacao: get(cols, col.observacao),
    loja: get(cols, col.loja),
    avaliador: get(cols, col.avaliador),
  })).filter(r => r.codInterno !== '');

  return { rows, errors };
}

export function extractLojaAnoMesFromFilename(filename: string): { loja: string | null; anoMes: string | null } {
  const m = filename.match(/(\d{6})_([A-Za-z0-9]+)/);
  if (!m) return { loja: null, anoMes: null };
  return { anoMes: m[1], loja: m[2].toUpperCase() };
}
