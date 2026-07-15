'use client';

import React from 'react';
import { ResaleHBar } from '@/components/resale/resale-h-bar';
import { type AgItem, type ChannelSegment } from '@/lib/actions/fetch-resale';

const fmtK = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const lucStr = (fat: number, custo: number) =>
  fat > 0 ? `${(((fat - custo) / fat) * 100).toFixed(1)}%` : '—';
const tmStr = (fat: number, qtd: number) =>
  qtd > 0 ? fmtK(fat / qtd) : '—';

interface Props {
  scrapFat: number;
  scrapCusto: number;
  scrapQtd: number;
  scrapByDestino: AgItem[];
  scrapB2b: ChannelSegment;
  scrapB2c: ChannelSegment;
}

export function ResaleScrapSummary({ scrapFat, scrapCusto, scrapQtd, scrapByDestino, scrapB2b, scrapB2c }: Props) {
  const total = scrapB2b.faturamento + scrapB2c.faturamento;
  const pct = (v: number) => (total > 0 ? ((v / total) * 100).toFixed(1) : '0.0');

  const segments = [
    { label: 'B2B', seg: scrapB2b, bar: 'bg-sky-500',   text: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-500/10'   },
    { label: 'B2C', seg: scrapB2c, bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">

      {/* Amber title strip */}
      <div className="shrink-0 px-4 py-2 bg-amber-500 rounded-t-lg">
        <span className="text-xs font-bold uppercase tracking-widest text-white">Scrap</span>
      </div>

      {/* KPI row */}
      <div className="shrink-0 grid grid-cols-4 divide-x divide-zinc-100 dark:divide-white/[0.06] border-b border-zinc-100 dark:border-white/[0.06]">
        {[
          { label: 'Faturamento',   value: fmtK(scrapFat) },
          { label: 'Lucratividade', value: lucStr(scrapFat, scrapCusto), cls: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Quantidade',    value: String(scrapQtd) },
          { label: 'TM',            value: tmStr(scrapFat, scrapQtd) },
        ].map(k => (
          <div key={k.label} className="flex flex-col gap-0.5 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{k.label}</span>
            <span className={`text-sm font-bold tabular-nums ${k.cls ?? 'text-zinc-900 dark:text-zinc-100'}`}>{k.value}</span>
          </div>
        ))}
      </div>

      {/* Por Destino */}
      <div className="flex-1 min-h-0 overflow-hidden px-2 pt-3 pb-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-1 mb-2">Por Destino</div>
        {scrapByDestino.length === 0
          ? <div className="text-sm text-zinc-400 text-center py-4">Sem dados</div>
          : <ResaleHBar data={scrapByDestino} color="#f59e0b" fullHeight />}
      </div>

      {/* B2B / B2C */}
      <div className="shrink-0 px-3 pb-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">B2B / B2C</div>
        <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
          {segments.map(s => (
            <div
              key={s.label}
              className={s.bar}
              style={{ width: `${pct(s.seg.faturamento)}%`, minWidth: s.seg.faturamento > 0 ? '2px' : '0' }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {segments.map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg px-3 py-2`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold uppercase tracking-wide ${s.text}`}>{s.label}</span>
                <span className={`text-xs font-bold ${s.text}`}>{pct(s.seg.faturamento)}%</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between gap-1">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wide">Fat.</span>
                  <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{fmtK(s.seg.faturamento)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wide">Lucr.</span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">{lucStr(s.seg.faturamento, s.seg.custo)}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wide">Qtd</span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">{s.seg.qtd}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="text-[11px] text-zinc-400 uppercase tracking-wide">TM</span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">{tmStr(s.seg.faturamento, s.seg.qtd)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
