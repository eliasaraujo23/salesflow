'use client';

import React from 'react';
import { type ChannelSegment } from '@/lib/actions/fetch-resale';

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function luc(seg: ChannelSegment): string {
  if (seg.faturamento <= 0) return '—';
  return `${(((seg.faturamento - seg.custo) / seg.faturamento) * 100).toFixed(1)}%`;
}

function ticket(seg: ChannelSegment): string {
  if (seg.qtd <= 0) return '—';
  return fmtMoeda(seg.faturamento / seg.qtd);
}

interface ResaleB2b2cProps {
  b2b: ChannelSegment;
  b2c: ChannelSegment;
  scrap: ChannelSegment;
}

export function ResaleB2b2c({ b2b, b2c, scrap }: ResaleB2b2cProps) {
  const total = b2b.faturamento + b2c.faturamento + scrap.faturamento;

  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  const pctB2b  = pct(b2b.faturamento);
  const pctB2c  = pct(b2c.faturamento);
  const pctScrap = pct(scrap.faturamento);

  const segments = [
    { label: 'B2B',   seg: b2b,   pct: pctB2b,   bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10' },
    { label: 'B2C',   seg: b2c,   pct: pctB2c,   bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Scrap', seg: scrap, pct: pctScrap, bar: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-500/10' },
  ];

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
              <span className={`text-[11px] font-bold uppercase tracking-wider ${s.text}`}>
                {s.label}
              </span>
              <span className={`text-[11px] font-bold ${s.text}`}>
                {s.pct.toFixed(1)}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <Row label="Faturamento" value={fmtMoeda(s.seg.faturamento)} bold />
              <Row label="Qtd" value={String(s.seg.qtd)} />
              <Row label="Lucratividade" value={luc(s.seg)} />
              <Row label="Ticket Médio" value={ticket(s.seg)} />
            </div>
          </div>
        ))}
      </div>
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
