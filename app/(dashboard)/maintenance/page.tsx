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
      {/* Header sticky */}
      <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 px-3 sm:px-6 pt-3 sm:pt-6 pb-3 -mt-3 sm:-mt-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Manutenções</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 hidden sm:block">
            Controle geral de peças em manutenção — JF · JM · JR
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {updatedAt && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 hidden sm:block">
              Atualizado às {updatedAt}
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
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
