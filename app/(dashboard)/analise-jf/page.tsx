'use client';

import React from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { useAnaliseJf } from '@/hooks/use-analise-jf';
import { AnaliseKpiCard } from '@/components/analise-jf/analise-kpi-card';
import { AnaliseRankingTable } from '@/components/analise-jf/analise-ranking-table';
import { AnaliseBarChart } from '@/components/analise-jf/analise-bar-chart';
import { type TipoItem, type PedraItem } from '@/lib/actions/fetch-analise-jf';

const TIPO_COLORS = [
  '#6366f1','#6366f1','#818cf8','#818cf8',
  '#a5b4fc','#a5b4fc','#c7d2fe','#c7d2fe',
  '#e0e7ff','#e0e7ff','#ede9fe','#ede9fe',
];

const PEDRA_COLORS: Record<string, string> = {
  'DIAMANTE':             '#f59e0b',
  'ESMERALDA':            '#10b981',
  'TURMALINA PARAÍBA':    '#3b82f6',
  'ESMERALDA COLOMBIANA': '#059669',
  'TURMALINA':            '#8b5cf6',
  'QUARTZO':              '#6b7280',
  'RUBI':                 '#ef4444',
};
function pedraColor(p: string) { return PEDRA_COLORS[p.toUpperCase()] ?? '#6366f1'; }

function fmtBRL(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function buildTipoData(rows: TipoItem[]) {
  return rows.map((r, i) => ({
    name: toTitleCase(r.produto),
    q: r.q,
    color: TIPO_COLORS[i] ?? '#6366f1',
  }));
}

function buildPedraData(rows: PedraItem[]) {
  return rows.map(r => ({
    name: toTitleCase(r.tipo_pedra),
    q: r.q,
    color: pedraColor(r.tipo_pedra),
  }));
}

export default function AnaliseJfPage() {
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useAnaliseJf();

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : '—';

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 px-3 sm:px-6 pt-3 sm:pt-6 pb-3 -mt-3 sm:-mt-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-500" />
              Análise <span className="text-indigo-600 dark:text-indigo-400">JF</span>
            </h1>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Carros-chefe por volume · tipo × subtipo × pedra · todas as lapidações
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08] rounded-lg hover:border-zinc-300 dark:hover:border-white/[0.15] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            {lastUpdate}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 dark:text-zinc-500 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" />
          Consultando banco de dados...
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500 dark:text-red-400">
            {(error as Error)?.message || 'Erro ao carregar dados.'}
          </p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      {/* Content */}
      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <AnaliseKpiCard
              label="Peças JF Vendidas"
              value={data.kpis.total.toLocaleString('pt-BR')}
              sub="mar/2022 – hoje · todos os status"
            />
            <AnaliseKpiCard
              label="Faturamento Total"
              value={fmtBRL(data.kpis.faturamento)}
              highlight
            />
            <AnaliseKpiCard
              label="Ticket Médio"
              value={fmtBRL(data.kpis.ticket_medio)}
              sub="por peça vendida"
            />
          </div>

          {/* Ranking */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              Top {data.ranking.length} — Carros-Chefe por Volume
            </div>
            <AnaliseRankingTable items={data.ranking} />
          </div>

          {/* Charts side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnaliseBarChart
              title="Por Tipo de Joia"
              data={buildTipoData(data.por_tipo)}
            />
            <AnaliseBarChart
              title="Por Pedra"
              data={buildPedraData(data.por_pedra)}
            />
          </div>
        </>
      )}
    </div>
  );
}
