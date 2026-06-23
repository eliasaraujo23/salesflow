'use client';

import React from 'react';
import { type UltimaVenda } from '@/lib/actions/fetch-resale';

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const TIPO_COLORS: Record<string, string> = {
  JF:  'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  JMF: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  JM:  'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  JR:  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
};

interface ResaleUltimasVendasProps {
  vendas: UltimaVenda[];
  totalQtd: number;
  newReferencias?: Set<string>;
}

export function ResaleUltimasVendas({ vendas, totalQtd, newReferencias }: ResaleUltimasVendasProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Últimas Vendas
        </span>
        <span className="text-[11px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-semibold">
          {totalQtd} vendas
        </span>
      </div>
      <div className="flex flex-col overflow-y-auto flex-1 min-h-0">
        {vendas.map((v, i) => (
          <div
            key={v.referencia}
            className={`flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-white/[0.04] gap-1.5 last:border-0 rounded ${newReferencias?.has(v.referencia) ? 'animate-sale-new-item' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[11px] font-mono font-semibold text-zinc-400 dark:text-zinc-500 uppercase leading-none">{v.referencia}</span>
                <span className={`text-[12px] font-bold px-1 py-px rounded leading-none ${TIPO_COLORS[v.tipo] ?? 'bg-zinc-500/15 text-zinc-500'}`}>
                  {v.tipo}
                </span>
              </div>
              <div className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight capitalize">{v.produto}</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">{v.destino}</div>
            </div>
            <span className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap flex-shrink-0">
              {fmtMoeda(v.preco)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
