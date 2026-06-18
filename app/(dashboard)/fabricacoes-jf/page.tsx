'use client';

import React from 'react';
import { Package, Hammer, CheckCircle, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { useJfDashboard } from '@/hooks/use-jf-dashboard';
import { KPICard } from '@/components/kpi-card';
import { FabAlertasCard } from '@/components/fabricacoes-jf/fab-alertas-card';
import { FabFabricacaoCard } from '@/components/fabricacoes-jf/fab-fabricacao-card';
import { FabSubtipoTable } from '@/components/fabricacoes-jf/fab-subtipo-table';
import { FabVendasChart } from '@/components/fabricacoes-jf/fab-vendas-chart';
import { FabPedrasChart } from '@/components/fabricacoes-jf/fab-pedras-chart';

const fmtMoedaK = (n: number) =>
  n >= 1000
    ? `R$${(n / 1000).toFixed(0)}k`
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function FabricacoesJFPage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useJfDashboard();

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
            Fabricações <span className="text-accent">JF</span>
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
          label="Vendidos Total"
          value={data.resumo.vendidos.toLocaleString('pt-BR')}
          subtext={`${data.resumo.vendidos_mes} vendidos este mês`}
          variant="green"
        />
        <KPICard
          icon={DollarSign}
          label="Ticket Médio"
          value={fmtMoedaK(data.resumo.ticket_medio)}
          subtext="média JF vendidas"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FabAlertasCard alertas={data.alertas} />
        <FabFabricacaoCard pecas={data.emFabricacao} />
      </div>

      <FabSubtipoTable data={data.estoqueCategoria} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FabVendasChart data={data.vendasMes} />
        <FabPedrasChart data={data.vendasPedra} />
      </div>
    </div>
  );
}
