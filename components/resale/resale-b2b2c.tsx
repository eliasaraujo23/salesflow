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

interface ResaleB2b2cProps {
  b2b: ChannelSegment;
  b2c: ChannelSegment;
}

export function ResaleB2b2c({ b2b, b2c }: ResaleB2b2cProps) {
  const total = b2b.faturamento + b2c.faturamento;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const segments = [
    { label: 'B2B', seg: b2b, pct: pct(b2b.faturamento), bar: 'bg-sky-500',   text: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-500/10'   },
    { label: 'B2C', seg: b2c, pct: pct(b2c.faturamento), bar: 'bg-green-500', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-2 min-w-0">
      {/* Barra proporcional */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {segments.map(s => (
          <div
            key={s.label}
            className={s.bar}
            style={{ width: `${s.pct.toFixed(1)}%`, minWidth: s.seg.faturamento > 0 ? '2px' : '0' }}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* Cards B2B / B2C */}
      <div className="space-y-1.5 min-w-0">
        {segments.map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg px-2.5 py-1.5 min-w-0`}>
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[13px] font-bold uppercase tracking-wider ${s.text}`}>{s.label}</span>
              <span className={`text-[13px] font-bold ${s.text}`}>{s.pct.toFixed(1)}%</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <Stat label="Faturamento" value={fmtK(s.seg.faturamento)} bold />
              <Stat label="Lucratividade" value={lucStr(s.seg)} />
              <Stat label="Quantidade" value={String(s.seg.qtd)} />
              <Stat label="Ticket Médio" value={ticketStr(s.seg)} />
            </div>
          </div>
        ))}
      </div>

      {/* Canais B2C */}
    </div>
  );
}

function Stat({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-1 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 shrink-0">{label}</span>
      <span className={`text-[12px] tabular-nums truncate text-right ${bold ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-300'}`}>
        {value}
      </span>
    </div>
  );
}
