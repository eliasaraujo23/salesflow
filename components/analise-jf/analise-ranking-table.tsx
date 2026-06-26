'use client';

import React from 'react';
import { type RankingItem } from '@/lib/actions/fetch-analise-jf';

const PEDRA_COLOR: Record<string, string> = {
  'DIAMANTE':              'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'ESMERALDA':             'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'ESMERALDA COLOMBIANA':  'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  'TURMALINA PARAÍBA':     'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'TURMALINA':             'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

function pedraClass(p: string) {
  return PEDRA_COLOR[p.toUpperCase()] ?? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
}

const BAR_COLOR: Record<string, string> = {
  'DIAMANTE':             '#f59e0b',
  'ESMERALDA':            '#10b981',
  'ESMERALDA COLOMBIANA': '#059669',
  'TURMALINA PARAÍBA':    '#3b82f6',
  'TURMALINA':            '#8b5cf6',
};
function barColor(p: string) { return BAR_COLOR[p.toUpperCase()] ?? '#6366f1'; }

function fmt(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (n >= 1_000)     return `R$ ${Math.round(n / 1_000)}k`;
  return `R$ ${n.toLocaleString('pt-BR')}`;
}

interface Props { items: RankingItem[] }

export function AnaliseRankingTable({ items }: Props) {
  const max = items[0]?.q ?? 1;
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-3 py-2.5 w-8 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">#</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-left">Tipo de Joia · Subtipo</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Pedra</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Qtd</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Ticket Médio</th>
              <th className="px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-3 py-2.5">
                  <span className={`text-xs font-mono ${i < 2 ? 'text-indigo-500 font-bold' : 'text-zinc-400'}`}>{i + 1}</span>
                </td>
                <td className="px-3 py-2.5 text-left">
                  <div className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">{item.tj}</div>
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500">{item.sub}</div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden w-28">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(item.q / max) * 100}%`, background: barColor(item.pedra) }}
                    />
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${pedraClass(item.pedra)}`}>
                    {item.pedra}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{item.q}</td>
                <td className="px-3 py-2.5 text-[12px] tabular-nums text-zinc-600 dark:text-zinc-400">
                  {item.ticket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2.5 text-[12px] tabular-nums font-medium text-zinc-700 dark:text-zinc-300">{fmt(item.fat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
