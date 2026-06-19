'use client';

import React from 'react';
import { type UltimaVenda } from '@/lib/actions/fetch-resale';

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface ResaleUltimasVendasProps {
  vendas: UltimaVenda[];
  totalQtd: number;
}

export function ResaleUltimasVendas({ vendas, totalQtd }: ResaleUltimasVendasProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Últimas Vendas
        </span>
        <span className="text-xs bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-semibold">
          {totalQtd} vendas
        </span>
      </div>
      <div className="flex flex-col overflow-y-auto flex-1 min-h-0">
        {vendas.map((v, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-white/[0.04] gap-2 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase leading-tight">{v.referencia}</div>
              <div className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate leading-tight capitalize">{v.produto}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">{v.destino}</div>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap flex-shrink-0">
              {fmtMoeda(v.preco)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
