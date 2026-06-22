'use client';

import React from 'react';
import { type ChannelSegment, type AgItem } from '@/lib/actions/fetch-resale';

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

function itemLucStr(item: AgItem): string {
  if (item.faturamento <= 0) return '—';
  return `${(((item.faturamento - item.custo) / item.faturamento) * 100).toFixed(1)}%`;
}

interface ResaleB2b2cProps {
  b2b: ChannelSegment;
  b2c: ChannelSegment;
  scrap: ChannelSegment;
  b2cBreakdown: AgItem[];
  scrapB2b: ChannelSegment;
  scrapB2c: ChannelSegment;
}

export function ResaleB2b2c({ b2b, b2c, scrap, b2cBreakdown, scrapB2b, scrapB2c }: ResaleB2b2cProps) {
  const total = b2b.faturamento + b2c.faturamento + scrap.faturamento;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const segments = [
    { label: 'B2B',   seg: b2b,   pct: pct(b2b.faturamento),   bar: 'bg-indigo-500',  text: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10'  },
    { label: 'B2C',   seg: b2c,   pct: pct(b2c.faturamento),   bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Scrap', seg: scrap, pct: pct(scrap.faturamento), bar: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-500/10'   },
  ];

  const b2cTotal = b2c.faturamento;

  return (
    <div className="space-y-2">
      {/* Proportional bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
        {segments.map(s => (
          <div
            key={s.label}
            className={`${s.bar}`}
            style={{ width: `${s.pct.toFixed(1)}%`, minWidth: s.seg.faturamento > 0 ? '2px' : '0' }}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Compact segment rows */}
      <div className="space-y-1.5">
        {segments.map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg px-2.5 py-1.5`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
              <span className={`text-[11px] font-bold ${s.text}`}>{s.pct.toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3">
              <MiniRow label="Faturamento" value={fmtK(s.seg.faturamento)} bold />
              <MiniRow label="Qtd" value={String(s.seg.qtd)} />
              <MiniRow label="Lucratividade" value={lucStr(s.seg)} />
              <MiniRow label="Ticket Médio" value={ticketStr(s.seg)} />
            </div>
          </div>
        ))}
      </div>

      {/* B2C channel breakdown */}
      {b2cBreakdown.length > 0 && (
        <BreakdownSection
          title="Canais B2C"
          total={b2cTotal}
          items={b2cBreakdown}
          barColor="bg-emerald-500"
          textColor="text-emerald-600 dark:text-emerald-400"
        />
      )}

      {/* Scrap B2B / B2C split */}
      {scrap.faturamento > 0 && (
        <ScrapChannelSplit scrapB2b={scrapB2b} scrapB2c={scrapB2c} scrapTotal={scrap.faturamento} />
      )}
    </div>
  );
}

interface BreakdownSectionProps {
  title: string;
  total: number;
  items: AgItem[];
  barColor: string;
  textColor: string;
}

function BreakdownSection({ title, total, items, barColor, textColor }: BreakdownSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          {title}
        </span>
        <span className={`text-[9px] font-semibold ${textColor}`}>
          {fmtK(total)}
        </span>
      </div>
      <div className="space-y-1">
        {items.map(item => {
          const share = total > 0 ? (item.faturamento / total) * 100 : 0;
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600 dark:text-zinc-400 w-24 shrink-0 truncate">
                {item.name}
              </span>
              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${barColor} rounded-full`} style={{ width: `${share}%` }} />
              </div>
              <span className={`text-[10px] font-semibold ${textColor} w-7 text-right shrink-0 tabular-nums`}>
                {share.toFixed(0)}%
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-16 text-right shrink-0 tabular-nums">
                {fmtK(item.faturamento)}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 w-8 text-right shrink-0 tabular-nums">
                {itemLucStr(item)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScrapChannelSplit({ scrapB2b, scrapB2c, scrapTotal }: {
  scrapB2b: ChannelSegment;
  scrapB2c: ChannelSegment;
  scrapTotal: number;
}) {
  const rows = [
    { label: 'B2B', seg: scrapB2b, bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'B2C', seg: scrapB2c, bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Scrap por Canal
        </span>
        <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400">
          {fmtK(scrapTotal)}
        </span>
      </div>
      <div className="space-y-1">
        {rows.map(({ label, seg, bar, text }) => {
          const share = scrapTotal > 0 ? (seg.faturamento / scrapTotal) * 100 : 0;
          const luc = seg.faturamento > 0
            ? `${(((seg.faturamento - seg.custo) / seg.faturamento) * 100).toFixed(1)}%`
            : '—';
          return (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold ${text} w-6 shrink-0`}>{label}</span>
              <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${bar} rounded-full`} style={{ width: `${share}%` }} />
              </div>
              <span className={`text-[10px] font-semibold ${text} w-7 text-right shrink-0 tabular-nums`}>
                {share.toFixed(0)}%
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-16 text-right shrink-0 tabular-nums">
                {fmtK(seg.faturamento)}
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 w-8 text-right shrink-0 tabular-nums">
                {luc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">{label}</span>
      <span className={`text-[10px] tabular-nums text-right ${bold ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-300'}`}>
        {value}
      </span>
    </div>
  );
}
