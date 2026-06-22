'use client';

import React from 'react';
import { type ChannelSegment, type AgItem } from '@/lib/actions/fetch-resale';

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function lucPct(seg: ChannelSegment): number {
  if (seg.faturamento <= 0) return 0;
  return ((seg.faturamento - seg.custo) / seg.faturamento) * 100;
}

function lucStr(seg: ChannelSegment): string {
  const p = lucPct(seg);
  return p === 0 ? '—' : `${p.toFixed(1)}%`;
}

function ticket(seg: ChannelSegment): string {
  if (seg.qtd <= 0) return '—';
  return fmtMoeda(seg.faturamento / seg.qtd);
}

interface ResaleB2b2cProps {
  b2b: ChannelSegment;
  b2c: ChannelSegment;
  scrap: ChannelSegment;
  b2cBreakdown: AgItem[];
}

export function ResaleB2b2c({ b2b, b2c, scrap, b2cBreakdown }: ResaleB2b2cProps) {
  const total = b2b.faturamento + b2c.faturamento + scrap.faturamento;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const segments = [
    { label: 'B2B',   seg: b2b,   pct: pct(b2b.faturamento),   bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10' },
    { label: 'B2C',   seg: b2c,   pct: pct(b2c.faturamento),   bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Scrap', seg: scrap, pct: pct(scrap.faturamento), bar: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-500/10' },
  ];

  // B2C internal breakdown
  const b2cTotal = b2c.faturamento;
  const topB2c = b2cBreakdown.slice(0, 5);

  return (
    <div className="space-y-3">
      {/* Proportional bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {segments.map(s => (
          <div
            key={s.label}
            className={`${s.bar} transition-all`}
            style={{ width: `${s.pct.toFixed(1)}%`, minWidth: s.seg.faturamento > 0 ? '2px' : '0' }}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Segment cards */}
      <div className="space-y-2">
        {segments.map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg p-2.5`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
              <span className={`text-[11px] font-bold ${s.text}`}>{s.pct.toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <Row label="Faturamento" value={fmtMoeda(s.seg.faturamento)} bold />
              <Row label="Qtd" value={String(s.seg.qtd)} />
              <Row label="Lucratividade" value={lucStr(s.seg)} />
              <Row label="Ticket Médio" value={ticket(s.seg)} />
            </div>
          </div>
        ))}
      </div>

      {/* B2C breakdown */}
      {topB2c.length > 0 && (
        <div className="pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Canais B2C
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {fmtMoeda(b2cTotal)} total
            </span>
          </div>
          <div className="space-y-2">
            {topB2c.map(item => {
              const share = b2cTotal > 0 ? (item.faturamento / b2cTotal) * 100 : 0;
              const itemLuc = item.faturamento > 0
                ? ((item.faturamento - item.custo) / item.faturamento) * 100
                : 0;
              const itemTicket = item.qtd > 0 ? item.faturamento / item.qtd : 0;
              return (
                <div key={item.name} className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate flex-1 min-w-0">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {share.toFixed(0)}%
                    </span>
                  </div>
                  {/* Proportion bar */}
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <Micro label="Fat" value={fmtMoeda(item.faturamento)} />
                    <Micro label="Qtd" value={String(item.qtd)} />
                    <Micro label="Luc" value={itemLuc > 0 ? `${itemLuc.toFixed(1)}%` : '—'} />
                    <Micro label="Ticket" value={itemTicket > 0 ? fmtMoeda(itemTicket) : '—'} span />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Micro({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-[8px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums">{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">{label}</span>
      <span className={`text-[11px] tabular-nums text-right ${bold ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
        {value}
      </span>
    </div>
  );
}
