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

const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TIPO_COLORS: Record<string, string> = {
  JF: '#6366f1',
  JMF: '#f97316',
  JR: '#10b981',
  JM: '#a855f7',
};

function tipoOf(tipo: string | null | undefined): string {
  if (!tipo) return 'JR';
  if (tipo === 'JF') return 'JF';
  if (tipo === 'JMF') return 'JMF';
  if (tipo === 'JMCP' || tipo === 'JMSP') return 'JM';
  return 'JR';
}

function lucrat(fat: number, custo: number): number {
  return fat > 0 ? Math.round(((fat - custo) / fat) * 100) : 0;
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
  b2bByDestino: PainelAgg[];
  b2cByDestino: PainelAgg[];
  monthly: PainelMonthRow[];
  jf: PainelKpi;
  revenda: PainelKpi;
  jfByProduto: PainelAgg[];
  revendaByProduto: PainelAgg[];
  leiloes: LeilaoData[];
  rows: PainelDetailRow[];
}

function agg(rows: PainelRow[], keyFn: (r: PainelRow) => string | null | undefined): PainelAgg[] {
  const map = new Map<string, PainelAgg>();
  for (const r of rows) {
    const key = keyFn(r)?.replace(/[​-‍﻿­]/g, '').trim().toUpperCase();
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

function buildPainelData(data: PainelRow[]): PainelVendasData {
  const allowed = data.filter(r =>
    r.destino && RV_DESTINOS.has(r.destino.toUpperCase()) &&
    r.nf_joia?.toUpperCase() !== 'SCRAP' &&
    RV_STATUS_MAIN.has(Number(r.status_id))
  );

  const b2cRows = allowed.filter(r => B2C_DESTINOS.has((r.destino ?? '').toUpperCase()));
  const b2bRows = allowed.filter(r => !B2C_DESTINOS.has((r.destino ?? '').toUpperCase()));
  const leilaoRows = allowed.filter(r => LEILAO_DESTINOS.has((r.destino ?? '').toUpperCase()));
  const jfRows = allowed.filter(r => tipoOf(r.tipo) === 'JF');
  const revendaRows = allowed.filter(r => tipoOf(r.tipo) !== 'JF');

  // Monthly grouping
  const monthMap = new Map<string, { fat: number; custo: number; qtd: number }>();
  for (const r of allowed) {
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
      return {
        mes,
        mesLabel: MESES_PT[parseInt(m) - 1] ?? mes,
        faturamento: fat,
        custo,
        qtd,
        ticketMedio: tm(fat, qtd),
      };
    });

  // Tipo donut
  const tipoMap = new Map<string, number>();
  for (const r of allowed) {
    const t = tipoOf(r.tipo);
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
      const rows = leilaoRows.filter(r => r.destino?.toUpperCase() === nome);
      if (rows.length === 0) return null;
      const jfR = rows.filter(r => tipoOf(r.tipo) === 'JF');
      const rvR = rows.filter(r => tipoOf(r.tipo) !== 'JF');
      const kpi = kpiOf(rows);
      return {
        nome,
        faturamento: kpi.faturamento,
        custo: kpi.custo,
        qtd: kpi.qtd,
        lucrat: kpi.lucrat,
        tmJF: jfR.length > 0 ? jfR.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0) / jfR.length : 0,
        tmRevenda: rvR.length > 0 ? rvR.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0) / rvR.length : 0,
        byProduto: agg(rows, r => r.produto ?? r.subtipo),
      };
    })
    .filter(Boolean) as LeilaoData[];

  const rows: PainelDetailRow[] = [...allowed]
    .filter(r => r.data_venda)
    .sort((a, b) => ((b.data_venda ?? '') > (a.data_venda ?? '') ? 1 : -1))
    .map(r => ({
      referencia: r.referencia,
      produto: r.produto ?? r.subtipo ?? '—',
      subtipo: r.subtipo ?? null,
      destino: r.destino ?? '—',
      custo_real: r.custo_real,
      preco_cobrado: r.preco_cobrado ?? 0,
      tipo: tipoOf(r.tipo),
      tipo_pedra: r.tipo_pedra ?? null,
      lucrat: lucrat(r.preco_cobrado ?? 0, r.custo_real),
      data_venda: r.data_venda ?? null,
    }));

  return {
    total: kpiOf(allowed),
    b2b: kpiOf(b2bRows),
    b2c: kpiOf(b2cRows),
    byTipo,
    byDestino: agg(allowed, r => r.destino).slice(0, 25),
    b2bByDestino: agg(b2bRows, r => r.destino),
    b2cByDestino: agg(b2cRows, r => r.destino),
    monthly,
    jf: kpiOf(jfRows),
    revenda: kpiOf(revendaRows),
    jfByProduto: agg(jfRows, r => r.produto ?? r.subtipo),
    revendaByProduto: agg(revendaRows, r => r.produto ?? r.subtipo),
    leiloes,
    rows,
  };
}

export function usePainelVendas(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['painel-vendas', from, to],
    queryFn: async () => {
      if (!from || !to) throw new Error('Date range required');
      const res = await fetchPainelRows(from, to);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar dados');
      return buildPainelData(res.data);
    },
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}
