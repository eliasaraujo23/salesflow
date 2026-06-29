'use client';

import React, { useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { useEvolucaoParceiros } from '@/hooks/use-evolucao-parceiros';
import { EvolucaoParceiroChart } from '@/components/graficos/evolucao-parceiros-chart';

const PERIODO_OPTIONS = [
  { label: '3 meses',  value: 3  },
  { label: '6 meses',  value: 6  },
  { label: '12 meses', value: 12 },
];

export default function EvolucaoParceiroPage() {
  const [meses, setMeses] = useState(6);
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useEvolucaoParceiros(meses);

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : '—';

  const totalFaturamento = data?.reduce((s, r) => s + r.faturamento, 0) ?? 0;
  const totalPecas = data?.reduce((s, r) => s + r.quantidade, 0) ?? 0;

  function fmtBRL(n: number) {
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-500" />
            Evolução de <span className="text-indigo-600 dark:text-indigo-400">Parceiros</span>
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Faturamento mensal por destino · JF + JMF · vendas confirmadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-lg border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
            {PERIODO_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMeses(opt.value)}
                className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  meses === opt.value
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
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

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Faturamento período', value: fmtBRL(totalFaturamento) },
            { label: 'Peças vendidas', value: totalPecas.toLocaleString('pt-BR') },
            { label: 'Ticket médio', value: totalPecas > 0 ? fmtBRL(Math.round(totalFaturamento / totalPecas)) : '—' },
            { label: 'Parceiros ativos', value: new Set(data.map(r => r.destino)).size.toString() },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">{kpi.label}</div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24 text-zinc-400 text-sm gap-2">
          <RefreshCw size={15} className="animate-spin" />
          Consultando banco de dados...
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <p className="text-sm text-red-500">{(error as Error)?.message || 'Erro ao carregar dados.'}</p>
          <button onClick={() => refetch()} className="text-sm text-indigo-500 hover:underline">Tentar novamente</button>
        </div>
      )}

      {/* Chart */}
      {data && data.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-5">
            Faturamento por parceiro — últimos {meses} meses · Top 8 + Outros
          </div>
          <EvolucaoParceiroChart data={data} />
        </div>
      )}
    </div>
  );
}
