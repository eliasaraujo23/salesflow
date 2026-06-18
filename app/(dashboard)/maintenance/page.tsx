'use client';

import React, { useMemo } from 'react';
import { Wrench, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useMaintenance } from '@/hooks/use-maintenance';
import { KPICard } from '@/components/kpi-card';
import { MaintenanceTable } from '@/components/maintenance/maintenance-table';

export default function MaintenancePage() {
  const { data, isLoading, isError, refetch, isFetching } = useMaintenance();

  const stats = useMemo(() => {
    if (!data) return { total: 0, criticos: 0, atencao: 0, ok: 0 };
    return {
      total: data.length,
      criticos: data.filter((i) => i.dias > 30).length,
      atencao: data.filter((i) => i.dias > 7 && i.dias <= 30).length,
      ok: data.filter((i) => i.dias <= 7).length,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-text-muted text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando manutenções...
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
          <h1 className="text-2xl font-bold text-text">Manutenções</h1>
          <p className="text-sm text-text-muted mt-1">Peças enviadas para manutenção externa</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Wrench} label="Total em Manutenção" value={stats.total} subtext="peças" variant="blue" />
        <KPICard icon={AlertTriangle} label="Críticos" value={stats.criticos} subtext="+30 dias fora" variant="red" />
        <KPICard icon={Clock} label="Atenção" value={stats.atencao} subtext="8 a 30 dias" variant="amber" />
        <KPICard icon={CheckCircle} label="Recentes" value={stats.ok} subtext="até 7 dias" variant="green" />
      </div>

      <MaintenanceTable data={data} />
    </div>
  );
}
