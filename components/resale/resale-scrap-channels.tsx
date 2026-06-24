'use client';

import React from 'react';
import { type ChannelSegment } from '@/lib/actions/fetch-resale';

const fmtK = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function lucStr(seg: ChannelSegment): string {
  if (seg.faturamento <= 0) return '—';
  return `${(((seg.faturamento - seg.custo) / seg.faturamento) * 100).toFixed(1)}%`;
}

function ticketStr(seg: ChannelSegment): string {
  if (seg.qtd <= 0) return '—';
  return fmtK(seg.faturamento / seg.qtd);
}

interface ResaleScrapChannelsProps {
  scrapB2b: ChannelSegment;
  scrapB2c: ChannelSegment;
}

export function ResaleScrapChannels({ scrapB2b, scrapB2c }: ResaleScrapChannelsProps) {
  const total = scrapB2b.faturamento + scrapB2c.faturamento;
  const totalQtd = scrapB2b.qtd + scrapB2c.qtd;
  const totalCusto = scrapB2b.custo + scrapB2c.custo;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const lucTotal = total > 0 ? (((total - totalCusto) / total) * 100).toFixed(1) + '%' : '—';
  const ticketTotal = totalQtd > 0 ? fmtK(total / totalQtd) : '—';

  const segments = [
    { label: 'B2B', seg: scrapB2b, bar: 'bg-indigo-500',  text: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10'  },
    { label: 'B2C', seg: scrapB2c, bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-2 overflow-x-hidden">
      {/* Resumo total */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pb-2 border-b border-zinc-100 dark:border-white/[0.13]">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Faturamento</div>
          <div className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">{fmtK(total)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Quantidade</div>
          <div className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">{totalQtd}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Lucratividade</div>
          <div className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400">{lucTotal}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Ticket Médio</div>
          <div className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">{ticketTotal}</div>
        </div>
      </div>

      {/* Proportional bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
        {segments.map(s => (
          <div
            key={s.label}
            className={s.bar}
            style={{ width: `${pct(s.seg.faturamento).toFixed(1)}%`, minWidth: s.seg.faturamento > 0 ? '2px' : '0' }}
            title={`${s.label}: ${pct(s.seg.faturamento).toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Segment cards */}
      <div className="space-y-1.5">
        {segments.map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg px-2.5 py-1.5`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[13px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
              <span className={`text-[13px] font-bold ${s.text}`}>{pct(s.seg.faturamento).toFixed(1)}%</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <MiniRow label="Faturamento" value={fmtK(s.seg.faturamento)} bold />
              <MiniRow label="Lucratividade" value={lucStr(s.seg)} />
              <MiniRow label="Quantidade" value={String(s.seg.qtd)} />
              <MiniRow label="Ticket Médio" value={ticketStr(s.seg)} />
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

function MiniRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">{label}</span>
      <span className={`text-[12px] tabular-nums text-right ${bold ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-300'}`}>
        {value}
      </span>
    </div>
  );
}
