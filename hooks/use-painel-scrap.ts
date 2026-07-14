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

const B2C_DESTINOS = new Set([
  'ETERNNO', 'MERCADO LIVRE', 'LEILÃO ETERNNO', 'LEILÃO BRUNO', 'LEILÃO 24K',
]);

const TIPO_COLORS: Record<string, string> = {
  JF: '#6366f1', JM: '#a855f7', JR: '#10b981', JC: '#f59e0b',
};

function clean(s: string | null | undefined): string {
  return (s ?? '').replace(/[​‌‍﻿­]/g, '').trim().toUpperCase();
}

function tipoOf(tipo: string | null | undefined): string | null {
  const t = (tipo ?? '').toUpperCase().trim();
  if (t === 'FAKE') return null;
  if (t === 'JF' || t === 'JMF') return 'JF';
  if (t === 'JMCP' || t === 'JMSP') return 'JM';
  if (t === 'JC') return 'JC';
  return 'JR';
}

const isScrap = (r: PainelRow) => clean(r.nf_joia) === 'SCRAP';
const isB2C   = (d: string | null | undefined) => B2C_DESTINOS.has(clean(d));

export interface ScrapAgg {
  name: string;
  faturamento: number;
  custo: number;
  qtd: number;
}

export interface ScrapKpi {
  faturamento: number;
  custo: number;
  qtd: number;
  lucrat: number;
  tm: number;
  pesoTotal: number;
}

export interface ScrapDetailRow {
  referencia: string;
  tipo: string;
  produto: string;
  subtipo: string | null;
  destino: string;
  peso: number;
  custo_real: number;
  preco_cobrado: number;
  lucrat: number;
  data_venda: string | null;
}

export interface ScrapData {
  kpi: ScrapKpi;
  b2b: ScrapKpi;
  b2c: ScrapKpi;
  byDestino: ScrapAgg[];
  byTipo: Array<{ name: string; value: number; color: string }>;
  rows: ScrapDetailRow[];
}

function kpiOf(rows: PainelRow[]): ScrapKpi {
  const fat   = rows.reduce((s, r) => s + (r.preco_cobrado ?? 0), 0);
  const custo = rows.reduce((s, r) => s + r.custo_real, 0);
  const qtd   = rows.length;
  const peso  = rows.reduce((s, r) => s + r.peso, 0);
  return {
    faturamento: fat,
    custo,
    qtd,
    lucrat: fat > 0 ? ((fat - custo) / fat) * 100 : 0,
    tm: qtd > 0 ? fat / qtd : 0,
    pesoTotal: peso,
  };
}

function buildScrapData(allRows: PainelRow[]): ScrapData {
  const allowed = allRows.filter(r => RV_DESTINOS.has(clean(r.destino)));
  const scrap   = allowed.filter(isScrap).filter(r => tipoOf(r.tipo) !== null);

  const b2cRows = scrap.filter(r => isB2C(r.destino));
  const b2bRows = scrap.filter(r => !isB2C(r.destino));

  const destiMap = new Map<string, ScrapAgg>();
  for (const r of scrap) {
    const key = clean(r.destino);
    if (!key) continue;
    const fat = r.preco_cobrado ?? 0;
    const e   = destiMap.get(key) ?? { name: key, faturamento: 0, custo: 0, qtd: 0 };
    e.faturamento += fat;
    e.custo       += r.custo_real;
    e.qtd++;
    destiMap.set(key, e);
  }
  const byDestino = Array.from(destiMap.values()).sort((a, b) => b.faturamento - a.faturamento);

  const tipoMap = new Map<string, number>();
  for (const r of scrap) {
    const t = tipoOf(r.tipo);
    if (!t) continue;
    tipoMap.set(t, (tipoMap.get(t) ?? 0) + (r.preco_cobrado ?? 0));
  }
  const byTipo = Array.from(tipoMap.entries())
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: TIPO_COLORS[name] ?? '#71717a' }))
    .sort((a, b) => b.value - a.value);

  const rows: ScrapDetailRow[] = [...scrap]
    .filter(r => r.data_venda)
    .sort((a, b) => ((b.data_venda ?? '') > (a.data_venda ?? '') ? 1 : -1))
    .map(r => {
      const fat = r.preco_cobrado ?? 0;
      return {
        referencia:    r.referencia,
        tipo:          tipoOf(r.tipo) ?? 'JR',
        produto:       clean(r.produto ?? r.subtipo) || '—',
        subtipo:       r.subtipo ? clean(r.subtipo) || null : null,
        destino:       clean(r.destino) || '—',
        peso:          r.peso,
        custo_real:    r.custo_real,
        preco_cobrado: fat,
        lucrat:        fat > 0 ? ((fat - r.custo_real) / fat) * 100 : 0,
        data_venda:    r.data_venda ?? null,
      };
    });

  return {
    kpi: kpiOf(scrap),
    b2b: kpiOf(b2bRows),
    b2c: kpiOf(b2cRows),
    byDestino,
    byTipo,
    rows,
  };
}

export function usePainelScrap(from: string | undefined, to: string | undefined) {
  return useQuery({
    queryKey: ['painel-scrap', from, to],
    queryFn: async () => {
      if (!from || !to) throw new Error('Date range required');
      const res = await fetchPainelRows(from, to);
      if (!res.data) throw new Error(res.message ?? 'Erro ao carregar dados');
      return buildScrapData(res.data);
    },
    enabled: !!from && !!to,
    staleTime: 5 * 60 * 1000,
  });
}
