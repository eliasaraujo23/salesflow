'use client';

import { Archive, ShoppingCart, Receipt, TrendingUp, RefreshCw } from 'lucide-react';
import { useJcDashboard } from '@/hooks/use-jc-dashboard';
import { FabKpiCard } from '@/components/fabricacoes-jf/fab-kpi-card';
import { JcEstoqueTab } from '@/components/fabricacoes-jc/jc-estoque-tab';

const fmtMoeda = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function FabricacoesJCPage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useJcDashboard();

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR')
    : '—';

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 px-3 sm:px-6 pt-3 sm:pt-6 pb-3 -mt-3 sm:-mt-6 bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Fabricações <span className="text-indigo-600 dark:text-indigo-400">JC</span>
            </h1>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">Joias Cadastradas — estoque em tempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap hidden sm:block">{lastUpdate}</span>
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

      {isLoading ? (
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FabKpiCard icon={Archive}      label="Estoque Disponível" value={data.resumo.estoque.toLocaleString('pt-BR')}      subtext="peças prontas p/ venda"                      variant="blue"   />
            <FabKpiCard icon={ShoppingCart} label="Vendidos Mês"       value={data.resumo.vendidos_mes.toLocaleString('pt-BR')} subtext={`${data.resumo.vendidos} total vendidos`}    variant="green"  />
            <FabKpiCard icon={Receipt}      label="Ticket Médio"       value={fmtMoeda(data.resumo.ticket_medio)}               subtext="mês atual"                                   variant="orange" />
            <FabKpiCard icon={TrendingUp}   label="Faturamento Mês"    value={fmtMoeda(data.resumo.faturamento_mes)}            subtext="mês atual"                                   variant="purple" />
          </div>

          <JcEstoqueTab data={data.listaEstoque} />
        </>
      )}
    </div>
  );
}
