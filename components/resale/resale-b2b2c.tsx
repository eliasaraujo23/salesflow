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
  b2cBreakdown: AgItem[];
}

export function ResaleB2b2c({ b2b, b2c, b2cBreakdown }: ResaleB2b2cProps) {
  const total = b2b.faturamento + b2c.faturamento;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const segments = [
    { label: 'B2B', seg: b2b, pct: pct(b2b.faturamento), bar: 'bg-indigo-500',  text: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-500/10'  },
    { label: 'B2C', seg: b2c, pct: pct(b2c.faturamento), bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
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
      {b2cBreakdown.length > 0 && (
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Canais B2C
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {fmtK(b2c.faturamento)}
            </span>
          </div>
          <div className="space-y-1 min-w-0">
            {b2cBreakdown.map(item => {
              const share = b2c.faturamento > 0 ? (item.faturamento / b2c.faturamento) * 100 : 0;
              return (
                <div key={item.name} className="min-w-0">
                  {/* Nome + % + valor na mesma linha */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[12px] text-zinc-600 dark:text-zinc-400 truncate min-w-0 flex-1">
                      {item.name}
                    </span>
                    <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                      {share.toFixed(0)}%
                    </span>
                    <span className="text-[12px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                      {fmtK(item.faturamento)}
                    </span>
                  </div>
                  <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${share}%` }} />
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
