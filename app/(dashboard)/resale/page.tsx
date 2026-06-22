'use client';

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useResale } from '@/hooks/use-resale';
import { useXauUsd } from '@/hooks/use-xau-usd';
import { ResaleHBar } from '@/components/resale/resale-h-bar';
import { ResaleDonut } from '@/components/resale/resale-donut';
import { ResaleDatePicker } from '@/components/resale/resale-date-picker';
import { ResaleTicker } from '@/components/resale/resale-ticker';
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-3 flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`text-lg font-bold truncate ${valueClass || 'text-zinc-900 dark:text-zinc-100'}`}>{value}</span>
    </div>
  );
}

function ScrapCard({ fat, custo, qtd, mainFat, topDestino }: {
  fat: number; custo: number; qtd: number; mainFat: number; topDestino?: string;
}) {
  const lucro = fat - custo;
  const pctTotal = mainFat > 0 ? (fat / mainFat * 100) : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">⚡ Scrap</div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-2">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Faturamento</div>
          <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{fmtMoedaK(fat)}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Quantidade</div>
          <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">{qtd}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">% do Total</div>
          <div className="text-[13px] font-bold text-amber-600 dark:text-amber-400">{pctTotal.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Lucratividade</div>
          <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">{fmtLuc(fat, custo)}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Ticket Médio</div>
          <div className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{ticketMedio(fat, qtd)}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Lucro Bruto</div>
          <div className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 truncate">{fmtMoedaK(lucro)}</div>
        </div>
      </div>
      {topDestino && (
        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Top Destino · </span>
          <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">{topDestino}</span>
        </div>
      )}
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
        <>
          {/* Row 1 — KPIs + SCRAP + Canal/Tipo */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <KPIBox label="Faturamento"   value={fmtMoedaK(data.faturamento)} />
              <KPIBox label="Lucratividade" value={fmtLuc(data.faturamento, data.custo)} valueClass="text-emerald-600 dark:text-emerald-400" />
              <KPIBox label="Ticket Médio"  value={ticketMedio(data.faturamento, data.qtd)} />
              <KPIBox label="Quantidade"    value={String(data.qtd)} />
            </div>
            <ScrapCard
              fat={data.scrapFat}
              custo={data.scrapCusto}
              qtd={data.scrapQtd}
              mainFat={data.faturamento}
              topDestino={data.scrapByDestino[0]?.name}
            />
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.06] rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Canal de Venda</div>
                  <ResaleDonut data={data.canalVenda} size={100} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Tipo de Fabricação</div>
                  <ResaleDonut data={data.byTipo} size={100} />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2 — Horizontal bar charts — flex-1 fills remaining space */}
          <div className="flex-1 min-h-0 grid grid-cols-3 auto-rows-fr gap-3">
            <SectionCard title="Por Destino" className="h-full flex flex-col" contentClass="flex-1 min-h-0">
              {data.byDestino.length === 0
                ? <div className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">Sem dados</div>
                : <ResaleHBar data={data.byDestino} color="#8b5cf6" labelWidth={160} fullHeight />}
            </SectionCard>
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
          </div>

        </>
      )}
    </div>
  );
}
