'use client';

import React from 'react';
import { Wrench, RefreshCw } from 'lucide-react';
import { useMaintenance } from '@/hooks/use-maintenance';
import { FabKpiCard } from '@/components/fabricacoes-jf/fab-kpi-card';
import { MaintenanceTab } from '@/components/maintenance/maintenance-tab';

export default function MaintenancePage() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useMaintenance();

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando manutenções...
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
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Manutenções</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Controle geral de peças em manutenção — JF · JM · JR
          </p>
        </div>
        <div className="flex items-center gap-3">
          {updatedAt && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Atualizado às {updatedAt}
            </span>
          )}
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

      {/* Single KPI card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <FabKpiCard
          icon={Wrench}
          label="Em Manutenção"
          value={data.length.toLocaleString('pt-BR')}
          subtext="peças em manutenção"
          variant="green"
        />
      </div>

      {/* PBI filter table */}
      <MaintenanceTab data={data} />
    </div>
  );
}
