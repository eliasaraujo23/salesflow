'use client';

import React, { useState } from 'react';
import { RefreshCw, Calendar } from 'lucide-react';
import { useResale } from '@/hooks/use-resale';
import { ResaleHBar } from '@/components/resale/resale-h-bar';
import { ResaleDonut } from '@/components/resale/resale-donut';
import { ResaleUltimasVendas } from '@/components/resale/resale-ultimas-vendas';

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
const fmtPct = (num: number, den: number) =>
  den > 0 ? `${(((num - den) / den) * 100).toFixed(2)}%` : '—';
const ticketMedio = (fat: number, qtd: number) =>
  qtd > 0 ? fmtMoeda(fat / qtd) : '—';

function KPIBox({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4 flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`text-xl font-bold truncate ${valueClass || 'text-zinc-900 dark:text-zinc-100'}`}>{value}</span>
    </div>
  );
}

function ScrapCard({ fat, custo, qtd }: { fat: number; custo: number; qtd: number }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">⚡ Scrap</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">Faturamento</div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{fmtMoedaK(fat)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">Quantidade</div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{qtd}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">Lucratividade</div>
          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmtPct(fat, custo)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">Ticket Médio</div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">{ticketMedio(fat, qtd)}</div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">{title}</div>
      {children}
    </div>
  );
}

export default function ResalePage() {
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo] = useState(todayISO());
  const { data, isLoading, isError, refetch, isFetching } = useResale(from, to);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg px-3 py-1.5">
            <Calendar size={13} className="text-zinc-500 dark:text-zinc-400" />
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
            <span className="text-zinc-400 dark:text-zinc-600">→</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="text-zinc-500 dark:text-zinc-400 text-sm flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Carregando...
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
          {/* Row 1 — KPIs + SCRAP + Últimas Vendas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main KPIs 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <KPIBox label="Faturamento" value={fmtMoedaK(data.faturamento)} />
              <KPIBox
                label="Lucratividade"
                value={fmtPct(data.faturamento, data.custo)}
                valueClass="text-emerald-600 dark:text-emerald-400"
              />
              <KPIBox label="Ticket Médio" value={ticketMedio(data.faturamento, data.qtd)} />
              <KPIBox label="Quantidade" value={String(data.qtd)} />
            </div>

            {/* SCRAP */}
            <ScrapCard fat={data.scrapFat} custo={data.scrapCusto} qtd={data.scrapQtd} />

            {/* Últimas Vendas */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4 min-h-[200px] max-h-[280px] overflow-hidden flex flex-col">
              <ResaleUltimasVendas vendas={data.ultimasVendas} totalQtd={data.qtd + data.scrapQtd} />
            </div>
          </div>

          {/* Row 2 — Horizontal bar charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Por Destino">
              {data.byDestino.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 py-8 text-center">Sem dados</div>
              ) : (
                <ResaleHBar data={data.byDestino} color="#8b5cf6" labelWidth={175} />
              )}
            </SectionCard>

            <SectionCard title="Por Tipo de Joia">
              {data.byProduto.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 py-8 text-center">Sem dados</div>
              ) : (
                <ResaleHBar data={data.byProduto} color="#10b981" labelWidth={145} />
              )}
            </SectionCard>

            <SectionCard title="Scrap — Por Destino">
              {data.scrapByDestino.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 py-8 text-center">Nenhum item de scrap no período</div>
              ) : (
                <ResaleHBar data={data.scrapByDestino} color="#71717a" labelWidth={175} />
              )}
            </SectionCard>
          </div>

          {/* Row 3 — Donuts + Vendedor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Canal de Venda">
              <ResaleDonut data={data.canalVenda} />
            </SectionCard>

            <SectionCard title="Tipo de Fabricação">
              <ResaleDonut data={data.byTipo} />
            </SectionCard>

            <SectionCard title="Vendedor Interno (Eternno)">
              {data.byVendedor.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 py-8 text-center">Sem vendas Eternno no período</div>
              ) : (
                <ResaleHBar data={data.byVendedor} color="#10b981" labelWidth={130} />
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
