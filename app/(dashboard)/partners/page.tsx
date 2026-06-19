'use client';

import React from 'react';
import { Store, TrendingUp, Package, DollarSign, RefreshCw } from 'lucide-react';
import { usePartnerSales, usePartnerConsignments } from '@/hooks/use-partners';
import { KPICard } from '@/components/kpi-card';
import { PartnerSalesTable } from '@/components/partners/partner-sales-table';
import { PartnerConsignmentTable } from '@/components/partners/partner-consignment-table';

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function PartnersPage() {
  const salesQuery = usePartnerSales();
  const consignmentQuery = usePartnerConsignments();

  const isLoading = salesQuery.isLoading || consignmentQuery.isLoading;
  const isError = salesQuery.isError || consignmentQuery.isError;

  const sales = salesQuery.data ?? [];
  const consignments = consignmentQuery.data ?? [];

  const totalVendas = sales.reduce((s, r) => s + r.total_vendas, 0);
  const totalPecasVendas = sales.reduce((s, r) => s + r.qtd_pecas, 0);
  const totalComodato = consignments.reduce((s, r) => s + r.total_loja, 0);
  const totalPecasComodato = consignments.reduce((s, r) => s + r.total_pecas, 0);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin" />
          Carregando dados de parceiros...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Erro ao carregar dados.{' '}
          <button
            onClick={() => {
              salesQuery.refetch();
              consignmentQuery.refetch();
            }}
            className="underline hover:no-underline"
          >
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
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Parceiros</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Vendas e comodatos com parceiros externos</p>
        </div>
        <button
          onClick={() => {
            salesQuery.refetch();
            consignmentQuery.refetch();
          }}
          disabled={salesQuery.isFetching || consignmentQuery.isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={salesQuery.isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingUp}
          label="Total Vendas"
          value={fmtMoeda(totalVendas)}
          subtext={`${totalPecasVendas} peças vendidas`}
          variant="green"
        />
        <KPICard
          icon={Store}
          label="Parceiros Ativos (Vendas)"
          value={sales.length}
          subtext="com vendas registradas"
          variant="blue"
        />
        <KPICard
          icon={Package}
          label="Comodato Total"
          value={fmtMoeda(totalComodato)}
          subtext={`${totalPecasComodato} peças em comodato`}
          variant="amber"
        />
        <KPICard
          icon={DollarSign}
          label="Parceiros (Comodato)"
          value={consignments.length}
          subtext="com comodato ativo"
          variant="purple"
        />
      </div>

      <div className="space-y-6">
        <PartnerSalesTable data={sales} />
        <PartnerConsignmentTable data={consignments} />
      </div>
    </div>
  );
}
