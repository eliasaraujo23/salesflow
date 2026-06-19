'use client';

import React, { useState } from 'react';
import { Package, Hammer, CheckCircle, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { useJmDashboard } from '@/hooks/use-jm-dashboard';
import { KPICard } from '@/components/kpi-card';
import { JmFabricacaoCard } from '@/components/fabricacoes-jm/jm-fabricacao-card';
import { JmEstoqueTable } from '@/components/fabricacoes-jm/jm-estoque-table';
import { JmFaturamentoTable } from '@/components/fabricacoes-jm/jm-faturamento-table';

const fmtMoedaK = (n: number) =>
  n >= 1000
    ? `R$${(n / 1000).toFixed(0)}k`
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const TABS = [
  { key: 'estoque', label: 'Estoque' },
  { key: 'faturamento', label: 'Faturamento' },
] as const;

export default function FabricacoesJMPage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useJmDashboard();
  const [activeTab, setActiveTab] = useState<'estoque' | 'faturamento'>('estoque');

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : '—';

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando dados...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Erro ao carregar dados.{' '}
          <button onClick={() => refetch()} className="underline hover:no-underline">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Fabricações <span className="text-indigo-600 dark:text-indigo-400">JM</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Atualizado: {lastUpdate}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          icon={Package}
          label="Total JM"
          value={data.resumo.total_jm.toLocaleString('pt-BR')}
          subtext={`${data.resumo.estoque} disponíveis`}
          variant="blue"
        />
        <KPICard
          icon={Hammer}
          label="Em Fabricação"
          value={data.resumo.em_fabricacao.toLocaleString('pt-BR')}
          subtext="peças em andamento"
          variant="amber"
        />
        <KPICard
          icon={CheckCircle}
          label="Vendidos Total"
          value={data.resumo.vendidos.toLocaleString('pt-BR')}
          subtext={`${data.resumo.vendidos_mes} este mês`}
          variant="green"
        />
        <KPICard
          icon={DollarSign}
          label="Ticket Médio"
          value={fmtMoedaK(data.resumo.ticket_medio)}
          subtext="média JM vendidas"
          variant="blue"
        />
        <KPICard
          icon={TrendingUp}
          label="Faturamento Mês"
          value={fmtMoedaK(data.resumo.faturamento_mes)}
          subtext="mês atual"
          variant="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="flex gap-2 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-70">
                  {tab.key === 'estoque' ? data.listaEstoque.length : data.listaFaturamento.length}
                </span>
              </button>
            ))}
          </div>
          {activeTab === 'estoque' ? (
            <JmEstoqueTable data={data.listaEstoque} />
          ) : (
            <JmFaturamentoTable data={data.listaFaturamento} />
          )}
        </div>
        <JmFabricacaoCard pecas={data.emFabricacao} />
      </div>
    </div>
  );
}
