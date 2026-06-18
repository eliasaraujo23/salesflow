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
        <div className="text-text-muted text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando dados...
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-semantic-red text-sm">
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
          <h1 className="text-2xl font-bold text-text">
            Fabricações <span className="text-accent">JM</span>
          </h1>
          <p className="text-sm text-text-muted mt-1">Atualizado: {lastUpdate}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-muted bg-bg-surface border border-border rounded-lg hover:border-accent transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          icon={Package}
          label="Estoque Disponível"
          value={data.resumo.estoque.toLocaleString('pt-BR')}
          subtext="peças prontas p/ venda"
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
          label="Vendidos no Mês"
          value={data.resumo.vendidos_mes.toLocaleString('pt-BR')}
          subtext="vendas este mês"
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
                    ? 'bg-accent text-white'
                    : 'bg-bg-surface border border-border text-text-muted hover:text-text'
                }`}
              >
                {tab.label}
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
