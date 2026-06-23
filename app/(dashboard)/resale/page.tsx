'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { useSaleSound } from '@/hooks/use-sale-sound';

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

function KPIBox({ label, value, valueClass = '', flash = false }: { label: string; value: string; valueClass?: string; flash?: boolean }) {
  return (
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg px-3 py-2 flex flex-col gap-0.5 ${flash ? 'animate-sale-kpi' : ''}`}>
      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`text-base font-bold truncate ${valueClass || 'text-zinc-900 dark:text-zinc-100'}`}>{value}</span>
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
      <div className="text-[12px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3 shrink-0">{title}</div>
      {contentClass ? <div className={contentClass}>{children}</div> : children}
    </div>
  );
}

export default function ResalePage() {
  const [from, setFrom] = useState(firstDayOfMonthISO());
  const [to, setTo]     = useState(todayISO());
  const { data, isLoading, isError, refetch, isFetching } = useResale(from, to);
  const ticker = useXauUsd();
  const playChime = useSaleSound();

  const prevQtdRef = useRef<number | null>(null);
  const prevReferenciasRef = useRef<Set<string>>(new Set());
  const [kpiFlash, setKpiFlash] = useState(false);
  const [newReferencias, setNewReferencias] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    const prevQtd = prevQtdRef.current;
    if (prevQtd === null) {
      prevQtdRef.current = data.qtd;
      prevReferenciasRef.current = new Set(data.ultimasVendas.map(v => v.referencia));
      return;
    }
    if (data.qtd > prevQtd) {
      const fresh = new Set(
        data.ultimasVendas.map(v => v.referencia).filter(r => !prevReferenciasRef.current.has(r))
      );
      playChime();
      setKpiFlash(true);
      setNewReferencias(fresh);
      const t = setTimeout(() => { setKpiFlash(false); setNewReferencias(new Set()); }, 4000);
      prevQtdRef.current = data.qtd;
      prevReferenciasRef.current = new Set(data.ultimasVendas.map(v => v.referencia));
      return () => clearTimeout(t);
    }
    prevQtdRef.current = data.qtd;
    prevReferenciasRef.current = new Set(data.ultimasVendas.map(v => v.referencia));
  }, [data, playChime]);

  return (
    <div className="p-3 sm:p-4 flex flex-col gap-3 md:overflow-hidden md:h-full">

      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <ResaleDatePicker from={from} to={to} onApply={(f, t) => { setFrom(f); setTo(t); }} />
          <ResaleTicker data={ticker} />
        </div>
        {/* Desktop: in-flow button */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="hidden md:flex ml-auto shrink-0 items-center gap-1.5 px-3 h-8 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Mobile: Atualizar fixed top-right (below topbar) */}
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="fixed top-[88px] right-3 z-20 md:hidden flex items-center justify-center w-9 h-9 text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-lg shadow-sm hover:border-indigo-500 transition-colors disabled:opacity-50"
        title="Atualizar"
      >
        <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
      </button>

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
        <div
          className="flex flex-col gap-3 md:flex-1 md:min-h-0 md:grid md:min-w-0"
          style={{ gridTemplateColumns: '2fr 3fr' }}
        >

          {/* Col 1: KPIs + Por Destino */}
          <div className="flex flex-col gap-3 md:min-h-0">
            <div className="grid gap-2 shrink-0" style={{ gridTemplateColumns: '3fr 2fr' }}>
              <KPIBox label="Faturamento"   value={fmtMoedaK(data.faturamento)} flash={kpiFlash} />
              <KPIBox label="Lucratividade" value={fmtLuc(data.faturamento, data.custo)} valueClass="text-emerald-600 dark:text-emerald-400" flash={kpiFlash} />
              <KPIBox label="Ticket Médio"  value={ticketMedio(data.faturamento, data.qtd)} flash={kpiFlash} />
              <KPIBox label="Quantidade"    value={String(data.qtd)} flash={kpiFlash} />
            </div>
            {/* Por Destino: min-h no mobile resolve recharts height:"100%" sem pai explícito */}
            <SectionCard title="Por Destino" className="md:flex-1 md:flex md:flex-col md:min-h-0" contentClass="min-h-[220px] md:min-h-0 md:flex-1">
              {data.byDestino.length === 0
                ? <div className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">Sem dados</div>
                : <ResaleHBar data={data.byDestino} color="#8b5cf6" labelWidth={160} fullHeight />}
            </SectionCard>
          </div>

          {/* Col 2: Mobile = coluna simples; Desktop = grid 3×2 com placement explícito */}
          <div
            className="flex flex-col gap-3 md:grid md:min-h-0"
            style={{ gridTemplateColumns: '1fr 1fr 180px', gridTemplateRows: '1fr 1fr' }}
          >
            <SectionCard title="Scrap · B2B / B2C" className="md:h-full md:flex md:flex-col md:col-start-1 md:row-start-1" contentClass="md:flex-1 md:min-h-0 md:overflow-y-auto">
              {data.scrapFat === 0
                ? <div className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">Nenhum item de scrap</div>
                : <ResaleScrapChannels scrapB2b={data.scrapB2b} scrapB2c={data.scrapB2c} />}
            </SectionCard>

            <SectionCard title="B2B · B2C" className="md:h-full md:flex md:flex-col md:col-start-2 md:row-start-1" contentClass="md:flex-1 md:min-h-0 md:overflow-y-auto">
              <ResaleB2b2c b2b={data.b2b} b2c={data.b2c} />
            </SectionCard>

            {/* Canal + Tipo — row 2, cols 1-2 */}
            <div className="flex flex-col gap-3 md:min-h-0 md:col-start-1 md:row-start-2 md:col-span-2">
              <SectionCard title="Canal de Venda" className="md:flex-1 md:flex md:flex-col" contentClass="md:flex-1 md:min-h-0 md:flex">
                <ResaleDonut data={data.canalVenda} horizontal />
              </SectionCard>
              <SectionCard title="Tipo de Fabricação" className="md:flex-1 md:flex md:flex-col" contentClass="md:flex-1 md:min-h-0 md:flex">
                <ResaleDonut data={data.byTipo} horizontal />
              </SectionCard>
            </div>

            {/* Últimas Vendas — col 3, rows 1-2; último no HTML = último no mobile */}
            <SectionCard title="Últimas Vendas" className="md:h-full md:flex md:flex-col md:col-start-3 md:row-start-1 md:row-span-2" contentClass="md:flex-1 md:min-h-0 md:overflow-y-auto">
              <ResaleUltimasVendas vendas={data.ultimasVendas} totalQtd={data.qtd} newReferencias={newReferencias} />
            </SectionCard>
          </div>

        </div>
      )}
    </div>
  );
}
