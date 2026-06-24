'use client';

import React, { useState } from 'react';
import { Archive, Hammer, ShoppingCart, Receipt, TrendingUp, Package, RefreshCw, TableProperties, BarChart3 } from 'lucide-react';
import { useJfDashboard } from '@/hooks/use-jf-dashboard';
import { FabKpiCard } from '@/components/fabricacoes-jf/fab-kpi-card';
import { FabFabricacaoTab } from '@/components/fabricacoes-jf/fab-fabricacao-tab';
import { FabSubtipoTable } from '@/components/fabricacoes-jf/fab-subtipo-table';
import { FabVendasTab } from '@/components/fabricacoes-jf/fab-vendas-tab';
import { FabEstoqueTab } from '@/components/fabricacoes-jf/fab-estoque-tab';

const fmtMoedaK = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

type Tab = 'estoque' | 'fabricacao' | 'controle' | 'vendas';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'estoque',    label: 'Estoque',    icon: <Archive size={14} /> },
  { key: 'fabricacao', label: 'Fabricação', icon: <Hammer size={14} /> },
  { key: 'controle',   label: 'Controle',   icon: <TableProperties size={14} /> },
  { key: 'vendas',     label: 'Vendas',     icon: <BarChart3 size={14} /> },
];

export default function FabricacoesJFPage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useJfDashboard();
  const [activeTab, setActiveTab] = useState<Tab>('estoque');

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : '—';

  const tabBtnCls = (key: Tab) =>
    `flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-[7px] transition-all ${
      activeTab === key
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
    }`;

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 px-3 sm:px-6 pt-3 sm:pt-6 pb-3 -mt-3 sm:-mt-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Fabricações <span className="text-indigo-600 dark:text-indigo-400">JF</span>
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">Estoque · Em fabricação · Vendidos — tempo real</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <nav className="flex items-center gap-0.5 p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl shrink-0">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={tabBtnCls(tab.key)}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap shrink-0 hidden sm:block">{lastUpdate}</span>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50 shrink-0"
            title="Atualizar"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
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
          {activeTab === 'estoque' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <FabKpiCard icon={Package}      label="Estoque Disponível" value={data.resumo.estoque.toLocaleString('pt-BR')}       subtext="peças prontas p/ venda"                          variant="blue"   />
                <FabKpiCard icon={Hammer}       label="Em Fabricação"      value={data.resumo.em_fabricacao.toLocaleString('pt-BR')} subtext="peças em andamento"                              variant="amber"  />
                <FabKpiCard icon={ShoppingCart} label="Vendidos Mês"       value={data.resumo.vendidos_mes.toLocaleString('pt-BR')}  subtext={`${data.resumo.vendidos} total vendidos`}         variant="green"  />
                <FabKpiCard icon={Receipt}      label="Ticket Médio"       value={fmtMoedaK(data.resumo.ticket_medio)}               subtext="mês atual"                                       variant="orange" />
                <FabKpiCard icon={TrendingUp}   label="Faturamento Mês"    value={fmtMoedaK(data.resumo.faturamento_mes)}            subtext="mês atual"                                       variant="purple" />
              </div>
              <FabEstoqueTab />
            </>
          )}

          {activeTab === 'fabricacao' && (
            <FabFabricacaoTab pecas={data.emFabricacao} />
          )}

          {activeTab === 'controle' && (
            <FabSubtipoTable data={data.estoqueCategoria} />
          )}
        </>
      )}
    </div>
  );
}
