'use client';

import React, { useState } from 'react';
import { Package, Hammer, CheckCircle, DollarSign, TrendingUp, RefreshCw, LayoutDashboard, TableProperties, BarChart3 } from 'lucide-react';
import { useJfDashboard } from '@/hooks/use-jf-dashboard';
import { KPICard } from '@/components/kpi-card';
import { FabAlertasCard } from '@/components/fabricacoes-jf/fab-alertas-card';
import { FabFabricacaoCard } from '@/components/fabricacoes-jf/fab-fabricacao-card';
import { FabSubtipoTable } from '@/components/fabricacoes-jf/fab-subtipo-table';
import { FabVendasChart } from '@/components/fabricacoes-jf/fab-vendas-chart';
import { FabPedrasChart } from '@/components/fabricacoes-jf/fab-pedras-chart';
import { FabVendasTab } from '@/components/fabricacoes-jf/fab-vendas-tab';

const fmtMoedaK = (n: number) =>
  n >= 1000
    ? `R$${(n / 1000).toFixed(0)}k`
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

type Tab = 'resumo' | 'fabricacao' | 'controle' | 'vendas';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'resumo',     label: 'Resumo',     icon: <LayoutDashboard size={14} /> },
  { key: 'fabricacao', label: 'Fabricação', icon: <Hammer size={14} /> },
  { key: 'controle',   label: 'Controle',   icon: <TableProperties size={14} /> },
  { key: 'vendas',     label: 'Vendas',     icon: <BarChart3 size={14} /> },
];

export default function FabricacoesJFPage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useJfDashboard();
  const [activeTab, setActiveTab] = useState<Tab>('resumo');

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : '—';

  const tabBtnCls = (key: Tab) =>
    `flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
      activeTab === key
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
    }`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Fabricações <span className="text-indigo-600 dark:text-indigo-400">JF</span>
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Atualizado: {lastUpdate}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <nav className="flex items-center gap-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={tabBtnCls(tab.key)}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {activeTab === 'vendas' ? (
        <FabVendasTab />
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Carregando dados...
          </div>
        </div>
      ) : isError || !data ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-red-600 dark:text-red-400 text-sm">
            Erro ao carregar dados.{' '}
            <button onClick={() => refetch()} className="underline hover:no-underline">
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'resumo' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard icon={Package}     label="Estoque Disponível" value={data.resumo.estoque.toLocaleString('pt-BR')}       subtext="peças prontas p/ venda"                         variant="blue"   />
                <KPICard icon={Hammer}      label="Em Fabricação"      value={data.resumo.em_fabricacao.toLocaleString('pt-BR')} subtext="peças em andamento"                             variant="amber"  />
                <KPICard icon={CheckCircle} label="Vendidos Total"     value={data.resumo.vendidos.toLocaleString('pt-BR')}      subtext={`${data.resumo.vendidos_mes} vendidos este mês`} variant="green"  />
                <KPICard icon={DollarSign}  label="Ticket Médio"       value={fmtMoedaK(data.resumo.ticket_medio)}              subtext="média JF vendidas"                              variant="blue"   />
                <KPICard icon={TrendingUp}  label="Faturamento Mês"    value={fmtMoedaK(data.resumo.faturamento_mes)}           subtext="mês atual"                                      variant="purple" />
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
            </>
          )}

          {activeTab === 'fabricacao' && (
            <FabFabricacaoCard pecas={data.emFabricacao} expanded />
          )}

          {activeTab === 'controle' && (
            <FabSubtipoTable data={data.estoqueCategoria} />
          )}
        </>
      )}
    </div>
  );
}
