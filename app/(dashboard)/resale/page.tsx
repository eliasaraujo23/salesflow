'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useResale } from '@/hooks/use-resale';
import { useXauUsd } from '@/hooks/use-xau-usd';
import { ResaleHBar } from '@/components/resale/resale-h-bar';
import { ResaleDonut } from '@/components/resale/resale-donut';
import { ResaleDatePicker } from '@/components/resale/resale-date-picker';
import { ResaleTicker } from '@/components/resale/resale-ticker';
import { ResaleUltimasVendas } from '@/components/resale/resale-ultimas-vendas';
import { ResaleB2b2c } from '@/components/resale/resale-b2b2c';
import { ResaleScrapChannels } from '@/components/resale/resale-scrap-channels';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function firstDayOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const fmtMoedaK = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtLuc = (fat: number, custo: number) =>
  fat > 0 ? `${(((fat - custo) / fat) * 100).toFixed(1)}%` : '—';
const ticketMedio = (fat: number, qtd: number) =>
  qtd > 0 ? fmtMoeda(fat / qtd) : '—';

function KPIBox({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg px-3 py-2 flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`text-sm font-bold truncate ${valueClass || 'text-zinc-900 dark:text-zinc-100'}`}>{value}</span>
    </div>
  );
}

function SectionCard({ title, children, className = '', contentClass }: {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClass?: string;
}) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4 ${className}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3 shrink-0">{title}</div>
      {contentClass ? <div className={contentClass}>{children}</div> : children}
    </div>
  );
}

export default function ResalePage() {
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo]     = useState(todayISO());
  const { data, isLoading, isError, refetch, isFetching } = useResale(from, to);
  const ticker = useXauUsd();

  return (
    <div className="p-4 flex flex-col gap-3 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <ResaleDatePicker from={from} to={to} onApply={(f, t) => { setFrom(f); setTo(t); }} />
          <ResaleTicker data={ticker} />
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" /> Carregando...
          </div>
        </div>
      ) : isError || !data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-600 dark:text-red-400 text-sm">
            Erro ao carregar dados.{' '}
            <button onClick={() => refetch()} className="underline hover:no-underline">Tentar novamente</button>
          </div>
        </div>
      ) : (
        /* Layout principal: Por Destino | grid 3×2 (Scrap/B2B/Vendas | Canal/Tipo) */
        <div className="flex-1 min-h-0 grid gap-3 min-w-0" style={{ gridTemplateColumns: '2fr 3fr' }}>

          {/* Col 1: KPIs (cima) + Por Destino (baixo) */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="grid gap-2 shrink-0" style={{ gridTemplateColumns: '3fr 2fr' }}>
              <KPIBox label="Faturamento"   value={fmtMoedaK(data.faturamento)} />
              <KPIBox label="Lucratividade" value={fmtLuc(data.faturamento, data.custo)} valueClass="text-emerald-600 dark:text-emerald-400" />
              <KPIBox label="Ticket Médio"  value={ticketMedio(data.faturamento, data.qtd)} />
              <KPIBox label="Quantidade"    value={String(data.qtd)} />
            </div>
            <SectionCard title="Por Destino" className="flex-1 flex flex-col min-h-0" contentClass="flex-1 min-h-0">
              {data.byDestino.length === 0
                ? <div className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">Sem dados</div>
                : <ResaleHBar data={data.byDestino} color="#8b5cf6" labelWidth={160} fullHeight />}
            </SectionCard>
          </div>

          {/* Col 2: grid 3 colunas × 2 linhas
              Linha 1: Scrap | B2B·B2C | Últimas Vendas
              Linha 2: Canal de Venda | Tipo de Fabricação | (vazio) */}
          <div className="grid gap-3 min-h-0" style={{ gridTemplateColumns: '1fr 1fr 180px', gridTemplateRows: '1fr 1fr' }}>

            <SectionCard title="Scrap · B2B / B2C" className="h-full flex flex-col" contentClass="flex-1 min-h-0 overflow-y-auto">
              {data.scrapFat === 0
                ? <div className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">Nenhum item de scrap</div>
                : <ResaleScrapChannels
                    scrapB2b={data.scrapB2b}
                    scrapB2c={data.scrapB2c}
                    scrapB2cBreakdown={data.scrapB2cBreakdown}
                  />}
            </SectionCard>

            <SectionCard title="B2B · B2C" className="h-full flex flex-col" contentClass="flex-1 min-h-0 overflow-y-auto">
              <ResaleB2b2c
                b2b={data.b2b}
                b2c={data.b2c}
                b2cBreakdown={data.b2cBreakdown}
              />
            </SectionCard>

            <SectionCard title="Últimas Vendas" className="h-full flex flex-col row-span-2" contentClass="flex-1 min-h-0 overflow-y-auto">
              <ResaleUltimasVendas vendas={data.ultimasVendas} totalQtd={data.qtd} />
            </SectionCard>

            <SectionCard title="Canal de Venda" className="h-full flex flex-col" contentClass="flex-1 min-h-0 flex">
              <ResaleDonut data={data.canalVenda} horizontal />
            </SectionCard>

            <SectionCard title="Tipo de Fabricação" className="h-full flex flex-col" contentClass="flex-1 min-h-0 flex">
              <ResaleDonut data={data.byTipo} horizontal />
            </SectionCard>

          </div>

        </div>
      )}
    </div>
  );
}
