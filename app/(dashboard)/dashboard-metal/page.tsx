'use client';

import React, { useState } from 'react';
import { type DateRange } from 'react-day-picker';
import { BarChart3, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDashboardMetalMensal, useDashboardMetalDetalhes } from '@/hooks/use-dashboard-metal';
import { DashboardMetalFilters } from '@/components/dashboard-metal/dashboard-metal-filters';
import { DashboardMetalKpis } from '@/components/dashboard-metal/dashboard-metal-kpis';
import { DashboardMetalComboAtendimentos } from '@/components/dashboard-metal/dashboard-metal-combo-atendimentos';
import { DashboardMetalComboValor } from '@/components/dashboard-metal/dashboard-metal-combo-valor';
import { DashboardMetalTabelaMensal } from '@/components/dashboard-metal/dashboard-metal-tabela-mensal';
import { DashboardMetalMetalBars } from '@/components/dashboard-metal/dashboard-metal-metal-bars';
import { DashboardMetalValorLoja } from '@/components/dashboard-metal/dashboard-metal-valor-loja';
import { DashboardMetalHorario } from '@/components/dashboard-metal/dashboard-metal-horario';
import { DashboardMetalFeedback } from '@/components/dashboard-metal/dashboard-metal-feedback';
import { DashboardMetalMotivoNc } from '@/components/dashboard-metal/dashboard-metal-motivo-nc';
import { DashboardMetalPrecoAvaliador } from '@/components/dashboard-metal/dashboard-metal-preco-avaliador';
import { DashboardMetalPrecoTabela } from '@/components/dashboard-metal/dashboard-metal-preco-tabela';
import { DashboardMetalAvaliadorCards } from '@/components/dashboard-metal/dashboard-metal-avaliador-cards';

function fmtDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultPeriodo(): DateRange {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  return { from, to: now };
}

export default function DashboardMetalPage() {
  const [loja, setLoja] = useState('TODAS');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultPeriodo);

  const inicio = dateRange?.from ? fmtDateISO(dateRange.from) : undefined;
  const fim = dateRange?.to ? fmtDateISO(dateRange.to) : (dateRange?.from ? fmtDateISO(dateRange.from) : undefined);

  const params = { loja: loja === 'TODAS' ? undefined : loja, inicio, fim };
  const { rows, loading } = useDashboardMetalMensal(params);
  const { detalhes, loading: loadingDetalhes } = useDashboardMetalDetalhes(params);

  const carregando = loading || loadingDetalhes;

  return (
    <Tabs defaultValue="geral" className="w-full">
      <div className="p-3 lg:p-4 space-y-3 lg:space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl px-3 lg:px-4 py-2.5 shadow-sm">
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shrink-0">
              <BarChart3 size={16} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight whitespace-nowrap">Dashboard Metal</h1>
          </div>

          <div className="hidden lg:block w-px self-stretch bg-zinc-200 dark:bg-white/[0.08] shrink-0" />

          <TabsList className="bg-zinc-100 dark:bg-zinc-800/60 shrink-0 w-full lg:w-auto grid grid-cols-4 lg:inline-flex h-auto lg:h-9">
            <TabsTrigger value="geral" className="text-[11px] lg:text-sm px-1.5 lg:px-3 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">Visão Geral</TabsTrigger>
            <TabsTrigger value="metal" className="text-[11px] lg:text-sm px-1.5 lg:px-3 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">
              <span className="lg:hidden">Metal</span><span className="hidden lg:inline">Metal &amp; Valor</span>
            </TabsTrigger>
            <TabsTrigger value="operacional" className="text-[11px] lg:text-sm px-1.5 lg:px-3 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">Operacional</TabsTrigger>
            <TabsTrigger value="avaliadores" className="text-[11px] lg:text-sm px-1.5 lg:px-3 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">Avaliadores</TabsTrigger>
          </TabsList>

          <div className="hidden lg:block w-px self-stretch bg-zinc-200 dark:bg-white/[0.08] shrink-0" />

          <DashboardMetalFilters
            loja={loja}
            onLojaChange={setLoja}
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
        </div>

        {carregando ? (
          <div className="space-y-5 animate-pulse">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
              ))}
            </div>
            <div className="flex items-center justify-center py-10 gap-2 text-zinc-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Carregando dados...
            </div>
          </div>
        ) : (
          <>
            <DashboardMetalKpis rows={rows} />

            <TabsContent value="geral" className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <DashboardMetalComboAtendimentos rows={rows} />
                <DashboardMetalComboValor rows={rows} />
              </div>
              <DashboardMetalTabelaMensal rows={rows} />
            </TabsContent>

            <TabsContent value="metal" className="space-y-4">
              <DashboardMetalMetalBars rows={rows} />
              <DashboardMetalValorLoja valorPorLoja={detalhes.valorPorLoja} lojaFiltro={loja} />
            </TabsContent>

            <TabsContent value="operacional" className="space-y-4">
              <DashboardMetalHorario horario={detalhes.horario} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                <DashboardMetalFeedback feedback={detalhes.feedback} />
                <DashboardMetalMotivoNc motivoNc={detalhes.motivoNc} />
              </div>
            </TabsContent>

            <TabsContent value="avaliadores" className="space-y-4">
              <DashboardMetalPrecoAvaliador precoAvaliador={detalhes.precoAvaliador} />
              <DashboardMetalPrecoTabela precoAvaliador={detalhes.precoAvaliador} />
              <DashboardMetalAvaliadorCards detalhes={detalhes} />
            </TabsContent>
          </>
        )}
      </div>
    </Tabs>
  );
}
