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
      <div className="flex flex-col gap-0 overflow-y-auto flex-1 min-h-0">
        {vendas.map((v, i) => (
          <div
            key={i}
            className="flex items-start justify-between py-2 border-b border-zinc-200/60 dark:border-white/[0.04] gap-3 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase">{v.referencia}</div>
              <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 capitalize">{v.produto}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{v.destino}</div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap flex-shrink-0 mt-0.5">
              {fmtMoeda(v.preco)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
