'use client';

import React, { useState } from 'react';
import { ShoppingBag, TrendingUp, Package, DollarSign, RefreshCw, Calendar } from 'lucide-react';
import { useResale } from '@/hooks/use-resale';
import { KPICard } from '@/components/kpi-card';
import { ResaleTable } from '@/components/resale/resale-table';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export default function ResalePage() {
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());

  const { data, isLoading, isError, refetch, isFetching } = useResale(from, to);

  const items = data ?? [];
  const totalQtd = items.reduce((s, r) => s + r.qtd, 0);
  const totalCusto = items.reduce((s, r) => s + r.total_custo, 0);
  const totalLoja = items.reduce((s, r) => s + r.total_loja, 0);
  const margem = totalCusto > 0 ? (((totalLoja - totalCusto) / totalCusto) * 100).toFixed(1) : '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">Revenda</h1>
          <p className="text-sm text-text-muted mt-1">Análise de revenda por fornecedor no período</p>
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

      <div className="flex items-center gap-4 p-4 bg-bg-surface border border-border rounded-lg flex-wrap">
        <Calendar size={16} className="text-text-muted" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-text-muted">De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-1.5 bg-bg border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-text-muted">Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-1.5 bg-bg border border-border rounded-md text-text text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-48">
          <div className="text-text-muted text-sm flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Carregando...
          </div>
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center min-h-48">
          <div className="text-semantic-red text-sm">
            Erro ao carregar dados.{' '}
            <button onClick={() => refetch()} className="underline hover:no-underline">
              Tentar novamente
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Package} label="Peças Revendidas" value={totalQtd} subtext="no período" variant="blue" />
            <KPICard icon={ShoppingBag} label="Fornecedores" value={items.length} subtext="com vendas" variant="purple" />
            <KPICard icon={DollarSign} label="Valor Loja" value={fmtMoeda(totalLoja)} subtext={`Custo: ${fmtMoeda(totalCusto)}`} variant="green" />
            <KPICard icon={TrendingUp} label="Margem Média" value={`${margem}%`} subtext="sobre o custo" variant="amber" />
          </div>

          <ResaleTable data={items} />
        </>
      )}
    </div>
  );
}
