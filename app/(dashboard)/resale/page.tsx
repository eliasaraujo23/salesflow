'use client';

import React, { useState, useEffect, useRef } from 'react';
import { localISO } from '@/lib/date-utils';
import { RefreshCw } from 'lucide-react';
import { useResale } from '@/hooks/use-resale';
import { useXauUsd } from '@/hooks/use-xau-usd';
import { ResaleHBar } from '@/components/resale/resale-h-bar';
import { ResaleDonut } from '@/components/resale/resale-donut';
import { CalendarDateRangePicker } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import { ResaleTicker } from '@/components/resale/resale-ticker';
import { ResaleUltimasVendas } from '@/components/resale/resale-ultimas-vendas';
import { ResaleScrapSummary } from '@/components/resale/resale-scrap-summary';
import { useSaleSound } from '@/hooks/use-sale-sound';

function todayISO() { return localISO(new Date()); }
function firstDayOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  return localISO(d);
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
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg px-3 py-2 flex flex-col gap-0.5 ${flash ? 'animate-sale-kpi relative z-20' : ''}`}>
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
    <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl p-4 ${className}`}>
      <div className="text-[12px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3 shrink-0">{title}</div>
      {contentClass ? <div className={contentClass}>{children}</div> : children}
    </div>
  );
}

export default function ResalePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: new Date(firstDayOfMonthISO()),
    to:   new Date(todayISO()),
  }));
  const from = dateRange?.from ? localISO(dateRange.from) : '';
  const to   = dateRange?.to   ? localISO(dateRange.to)   : '';
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

      {/* Header sticky — gruda no topo ao rolar no mobile */}
      <div className="sticky top-0 z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 sm:py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-white/[0.08] shadow-sm shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <CalendarDateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
            <ResaleTicker data={ticker} />
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
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
        <div
          className="flex flex-col gap-3 md:flex-1 md:min-h-0 md:grid md:min-w-0 md:pt-0.5"
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
            <SectionCard title="Por Destino" className="md:flex-1 md:flex md:flex-col md:min-h-0" contentClass="min-h-[220px] md:min-h-0 md:flex-1">
              {data.byDestino.length === 0
                ? <div className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">Sem dados</div>
                : <ResaleHBar data={data.byDestino} color="#8b5cf6" labelWidth={160} fullHeight />}
            </SectionCard>
          </div>

          {/* Col 2 */}
          <div
            className="flex flex-col gap-3 md:grid md:min-h-0"
            style={{ gridTemplateColumns: '1fr 1fr 180px', gridTemplateRows: '1fr 1fr' }}
          >
            <div className="md:col-start-2 md:row-start-1 md:row-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl md:h-full md:flex md:flex-col md:min-h-0 overflow-hidden">
              {data.scrapFat === 0
                ? <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">Nenhum item de scrap</div>
                : <ResaleScrapSummary
                    scrapFat={data.scrapFat}
                    scrapCusto={data.scrapCusto}
                    scrapQtd={data.scrapQtd}
                    scrapByDestino={data.scrapByDestino}
                    scrapB2b={data.scrapB2b}
                    scrapB2c={data.scrapB2c}
                  />}
            </div>

            {/* Canal de Venda + Tipo de Fabricação — empilhados em col 1, row 2 */}
            <div className="flex flex-col gap-3 md:col-start-1 md:row-start-2 md:h-full">
              <SectionCard title="Canal de Venda" className="md:flex-1">
                <ResaleDonut data={data.canalVenda} horizontal />
              </SectionCard>
              <SectionCard title="Tipo de Fabricação" className="md:flex-1">
                <ResaleDonut data={data.byTipo} horizontal />
              </SectionCard>
            </div>

            {/* Eternno por Tipo — col 2, row 2 */}
            <SectionCard title="Eternno · Por Tipo" className="md:col-start-1 md:row-start-1 md:h-full md:flex md:flex-col">
              {/* KPIs Eternno */}
              <div className="grid grid-cols-2 gap-1.5 mb-3 shrink-0">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Faturamento</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{fmtMoedaK(data.eternnoFat)}</span>
                  {data.eternnoScrapFat > 0 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 tabular-nums">Scrap: {fmtMoedaK(data.eternnoScrapFat)}</span>
                  )}
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Quantidade</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{data.eternnoQtd}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Lucratividade</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmtLuc(data.eternnoFat, data.eternnoCusto)}</span>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ticket Médio</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{ticketMedio(data.eternnoFat, data.eternnoQtd)}</span>
                </div>
              </div>
              {data.eternnoByTipo.length === 0 ? (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">Sem dados Eternno</div>
              ) : (
                <div className="flex flex-col gap-3 flex-1 justify-center">
                  {data.eternnoByTipo.map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 w-10 shrink-0">{item.name}</span>
                      <div className="flex-1 h-5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${(item.faturamento / data.eternnoByTipo[0].faturamento) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums whitespace-nowrap shrink-0">
                        {item.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Últimas Vendas — col 3 rows 1-2; último no HTML = último no mobile */}
            <SectionCard title="Últimas Vendas" className="md:h-full md:flex md:flex-col md:col-start-3 md:row-start-1 md:row-span-2" contentClass="md:flex-1 md:min-h-0 md:overflow-y-auto">
              <ResaleUltimasVendas vendas={data.ultimasVendas} totalQtd={data.qtd} newReferencias={newReferencias} />
            </SectionCard>
          </div>

        </div>
      )}
    </div>
  );
}
