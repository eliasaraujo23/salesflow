'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchPainelRows, type PainelRow } from '@/lib/actions/fetch-painel';

const RV_DESTINOS = new Set([
  'DESAPEGO DO LUXO', 'DESAPEGO LEGAL', 'DESAPEGUE BR', 'JUGELLI DESAPEGO',
  'RESOLVI DESAPEGO', 'RESOLVI DESAPEGAR', 'ACHADOS PERDIDOS', 'ALINE RAMOS', 'ALINI DUARTE',
  'ANDRÉ FAUSTINO', 'BRILHO VINTAGE', 'CARLA LEILÃO', 'CIRCULAR JOIAS',
  'CLAUDIA MASCARENHAS', 'DANIELLE VOGUE', 'ELIANE DANTAS', 'ETERNNO',
  'ETIQUETA ÚNICA', 'ETSY BRECHO', 'FERNANDA SCARAMBONE', 'GRINGA',
  'ILA LUX', 'IVAIR ONGARATTO', 'IZABELLA BARCKI', 'JOÃO FECHY JOIAS',
  'LAURA BATEZINI', 'LEILÃO 24K', 'LEILÃO BRUNO', 'LEILÃO ETERNNO',
  'LOHANA COELHO', 'LOUCA POR JÓIAS', 'LUCIMARY', 'MEGA DO LUXO',
  'MERCADO LIVRE', 'NIUMA', 'REAL DEAL', 'SECOND HAND', 'SIDNEI QUARTIER',
  'TATI CANTO', 'TRIZZ JOIAS', 'UMA VEZ MAIS', 'JÓIAS EM DESAPEGO',
]);

const RV_STATUS_MAIN = new Set([2, 4, 13]);

const B2C_DESTINOS = new Set([
  'ETERNNO', 'MERCADO LIVRE', 'LEILÃO ETERNNO', 'LEILÃO BRUNO', 'LEILÃO 24K',
]);

const LEILAO_DESTINOS = new Set(['LEILÃO ETERNNO', 'LEILÃO BRUNO', 'LEILÃO 24K']);

// Só remove chars invisíveis Unicode — NÃO remove espaços
function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/[​‌‍﻿­]/g, '').trim().toUpperCase();
}

const isScrap = (r: { nf_joia?: string | null }) => clean(r.nf_joia) === 'SCRAP';
const isB2C = (d: string | null | undefined) => B2C_DESTINOS.has(clean(d));
const isLeilao = (d: string | null | undefined) => LEILAO_DESTINOS.has(clean(d));

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TIPO_COLORS: Record<string, string> = {
  JF: '#6366f1', JM: '#a855f7', JR: '#10b981', JC: '#f59e0b',
};

// JF = JF + JMF | JM = JMCP + JMSP | JC = JC | FAKE = excluído | JR = resto
function tipoOf(tipo: string | null | undefined): string | null {
  const t = (tipo ?? '').toUpperCase().trim();
  if (t === 'FAKE') return null; // não contabiliza
  if (t === 'JF' || t === 'JMF') return 'JF';
  if (t === 'JMCP' || t === 'JMSP') return 'JM';
  if (t === 'JC') return 'JC';
  return 'JR';
}

function lucrat(fat: number, custo: number): number {
  return fat > 0 ? Math.round(((fat - custo) / fat) * 10000) / 100 : 0;
}

function tm(fat: number, qtd: number): number {
  return qtd > 0 ? fat / qtd : 0;
}

export interface PainelAgg {
  name: string;
  faturamento: number;
  custo: number;
  qtd: number;
}

export interface PainelDestinoAgg {
  name: string;
  qtd: number;
  total: number;
  JR: number;
  JF: number;
  JM: number;
  JC: number;
}

export interface PainelKpi {
  faturamento: number;
  custo: number;
  qtd: number;
  lucrat: number;
  tm: number;
}

export interface PainelMonthRow {
  mes: string;
  mesLabel: string;
  faturamento: number;
  custo: number;
  qtd: number;
  ticketMedio: number;
}

export interface LeilaoData {
  nome: string;
  faturamento: number;
  custo: number;
  qtd: number;
  lucrat: number;
  tmJF: number;
  tmRevenda: number;
  byProduto: PainelAgg[];
  rows: PainelDetailRow[];
}

export interface PainelDetailRow {
  referencia: string;
  produto: string;
  subtipo: string | null;
  destino: string;
  custo_real: number;
  preco_cobrado: number;
  tipo: string;
  tipo_pedra: string | null;
  lucrat: number;
  data_venda: string | null;
}

export interface PainelVendasData {
  total: PainelKpi;
  b2b: PainelKpi;
  b2c: PainelKpi;
  byTipo: Array<{ name: string; value: number; color: string }>;
  byDestino: PainelAgg[];
  byDestinoStacked: PainelDestinoAgg[];
  destinos: string[];
  destinosSorted: string[];
  b2bByDestino: PainelAgg[];
  b2cByDestino: PainelAgg[];
  monthly: PainelMonthRow[];
  jf: PainelKpi;
  jm: PainelKpi;
  revenda: PainelKpi;
  jfByProduto: PainelAgg[];
  jmByProduto: PainelAgg[];
  revendaByProduto: PainelAgg[];
  leiloes: LeilaoData[];
  rows: PainelDetailRow[];
}

function agg(rows: PainelRow[], keyFn: (r: PainelRow) => string | null | undefined): PainelAgg[] {
  const map = new Map<string, PainelAgg>();
  for (const r of rows) {
    const key = clean(keyFn(r));
    if (!key) continue;
    const fat = r.preco_cobrado ?? 0;
    const e = map.get(key);
    if (e) { e.qtd++; e.faturamento += fat; e.custo += r.custo_real; }
    else map.set(key, { name: key, qtd: 1, faturamento: fat, custo: r.custo_real });
  }
  return Array.from(map.values()).sort((a, b) => b.faturamento - a.faturamento);
}

function kpiOf(rows: PainelRow[]): PainelKpi {
  const fat = rows.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0);
  const custo = rows.reduce((s, r) => s + r.custo_real, 0);
  const qtd = rows.length;
  return { faturamento: fat, custo, qtd, lucrat: lucrat(fat, custo), tm: tm(fat, qtd) };
}

function buildPainelData(data: PainelRow[], destinoFilter?: string[] | null): PainelVendasData {
  // Mesma lógica de fetch-resale.ts — sem normDest no allowed (igual Revenda)
  const allowed = data.filter(r => {
    const d = (r.destino ?? '').trim().toUpperCase();
    return d && RV_DESTINOS.has(d);
  });
  // Scrap rows sempre entram (igual Revenda)
  const main = allowed.filter(r => isScrap(r) || RV_STATUS_MAIN.has(Number(r.status_id)));

  // Lista de destinos para o seletor: sempre vem de main (sem filtro aplicado)
  const byDestinoAll = agg(main, r => r.destino).slice(0, 30);
  const destinos = byDestinoAll.map(d => d.name);
  const destinosSorted = destinos.slice().sort((a, b) => a.localeCompare(b, 'pt-BR'));

  // Aplica filtro de destinos + exclui FAKE (não contabiliza)
  const filtered = (destinoFilter && destinoFilter.length > 0
    ? main.filter(r => destinoFilter.includes(clean(r.destino)))
    : main
  ).filter(r => tipoOf(r.tipo) !== null);

  // Per-destino tipo breakdown for stacked chart
  const destinoBreakdownMap = new Map<string, { qtd: number; JR: number; JF: number; JM: number; JC: number }>();
  for (const r of filtered) {
    const dest = clean(r.destino);
    const t = tipoOf(r.tipo) as 'JR' | 'JF' | 'JM' | 'JC' | null;
    if (!dest || !t) continue;
    const fat = r.preco_cobrado ?? 0;
    const e = destinoBreakdownMap.get(dest) ?? { qtd: 0, JR: 0, JF: 0, JM: 0, JC: 0 };
    e.qtd++;
    e[t] += fat;
    destinoBreakdownMap.set(dest, e);
  }
  const byDestinoStacked: PainelDestinoAgg[] = Array.from(destinoBreakdownMap.entries())
    .map(([name, e]) => ({
      name, qtd: e.qtd,
      total: e.JR + e.JF + e.JM + e.JC,
      JR: e.JR, JF: e.JF, JM: e.JM, JC: e.JC,
    }))
    .sort((a, b) => b.total - a.total);

  // Gráfico de destinos reflete o filtro aplicado
  const byDestinoFiltered = agg(filtered, r => r.destino);

  const b2cRows = filtered.filter(r => isB2C(r.destino));
  const b2bRows = filtered.filter(r => !isB2C(r.destino));
  const leilaoRows = filtered.filter(r => isLeilao(r.destino));
  const jfRows = filtered.filter(r => tipoOf(r.tipo) === 'JF');
  const jmRows = filtered.filter(r => tipoOf(r.tipo) === 'JM');
  const revendaRows = filtered.filter(r => tipoOf(r.tipo) !== 'JF' && tipoOf(r.tipo) !== 'JM' && tipoOf(r.tipo) !== 'JC');

  // Monthly
  const monthMap = new Map<string, { fat: number; custo: number; qtd: number }>();
  for (const r of filtered) {
    if (!r.data_venda) continue;
    const mes = r.data_venda.substring(0, 7);
    const e = monthMap.get(mes) ?? { fat: 0, custo: 0, qtd: 0 };
    e.fat += r.preco_cobrado ?? 0;
    e.custo += r.custo_real;
    e.qtd++;
    monthMap.set(mes, e);
  }
  const monthly: PainelMonthRow[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, { fat, custo, qtd }]) => {
      const [, m] = mes.split('-');
      return { mes, mesLabel: MESES_PT[parseInt(m) - 1] ?? mes, faturamento: fat, custo, qtd, ticketMedio: tm(fat, qtd) };
    });

  // Tipo donut (FAKE já excluído de filtered)
  const tipoMap = new Map<string, number>();
  for (const r of filtered) {
    const t = tipoOf(r.tipo);
    if (!t) continue;
    tipoMap.set(t, (tipoMap.get(t) ?? 0) + (r.preco_cobrado ?? 0));
  }
  const byTipo = Array.from(tipoMap.entries())
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: TIPO_COLORS[name] ?? '#71717a' }))
    .sort((a, b) => b.value - a.value);

  // Leilões
  const leilaoNames = ['LEILÃO ETERNNO', 'LEILÃO BRUNO', 'LEILÃO 24K'];
  const leiloes: LeilaoData[] = leilaoNames
    .map(nome => {
      const lRows = leilaoRows.filter(r => clean(r.destino) === nome);
      if (lRows.length === 0) return null;
      const jfR = lRows.filter(r => tipoOf(r.tipo) === 'JF');
      const rvR = lRows.filter(r => tipoOf(r.tipo) !== 'JF');
      const kpi = kpiOf(lRows);
      return {
        nome,
        faturamento: kpi.faturamento,
        custo: kpi.custo,
        qtd: kpi.qtd,
        lucrat: kpi.lucrat,
        tmJF: jfR.length > 0 ? jfR.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0) / jfR.length : 0,
        tmRevenda: rvR.length > 0 ? rvR.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0) / rvR.length : 0,
        byProduto: agg(lRows, r => isScrap(r) ? 'SCRAP' : (r.produto ?? r.subtipo)),
        rows: [...lRows]
          .filter(r => r.data_venda)
          .sort((a, b) => ((b.data_venda ?? '') > (a.data_venda ?? '') ? 1 : -1))
          .map(toDetailRow),
      };
    })
    .filter(Boolean) as LeilaoData[];

  const toDetailRow = (r: PainelRow): PainelDetailRow => ({
    referencia: r.referencia,
    produto: r.produto ?? r.subtipo ?? '—',
    subtipo: r.subtipo ?? null,
    destino: r.destino ?? '—',
    custo_real: r.custo_real,
    preco_cobrado: r.preco_cobrado ?? 0,
    tipo: tipoOf(r.tipo) ?? 'JR',
    tipo_pedra: r.tipo_pedra ?? null,
    lucrat: lucrat(r.preco_cobrado ?? 0, r.custo_real),
    data_venda: r.data_venda ?? null,
  });

  const rows: PainelDetailRow[] = [...filtered]
    .filter(r => r.data_venda)
    .sort((a, b) => ((b.data_venda ?? '') > (a.data_venda ?? '') ? 1 : -1))
    .map(toDetailRow);

  return {
    total: kpiOf(filtered),
    b2b: kpiOf(b2bRows),
    b2c: kpiOf(b2cRows),
    byTipo,
    byDestino: byDestinoFiltered,
    byDestinoStacked,
    destinos,
    destinosSorted,
    b2bByDestino: agg(b2bRows, r => r.destino),
    b2cByDestino: agg(b2cRows, r => r.destino),
    monthly,
    jf: kpiOf(jfRows),
    jm: kpiOf(jmRows),
    revenda: kpiOf(revendaRows),
    jfByProduto: agg(jfRows, r => r.produto ?? r.subtipo),
    jmByProduto: agg(jmRows, r => r.produto ?? r.subtipo),
    revendaByProduto: agg(revendaRows, r => r.produto ?? r.subtipo),
    leiloes,
    rows,
  };
}

export function usePainelVendas(
  from: string | undefined,
  to: string | undefined,
  destinos?: string[] | null,
) {
  const destinoKey = destinos && destinos.length > 0 ? [...destinos].sort().join(',') : null;
  return useQuery({
    queryKey: ['painel-vendas', from, to, destinoKey],
    queryFn: async () => {
      if (!from || !to) throw new Error('Date range required');
      const res = await fetchPainelRows(from, to);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar dados');
      return buildPainelData(res.data, destinos);
    },
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}
