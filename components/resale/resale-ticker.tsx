'use client';

import React from 'react';
import { type XauUsdData } from '@/hooks/use-xau-usd';

const fmtBRL = (v: number, dec = 2) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtPct = (v: number) => {
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}%`;
};

interface TickerChipProps {
  icon: string;
  label: string;
  price: string;
  pct: string;
  positive: boolean;
}

function TickerChip({ icon, label, price, pct, positive }: TickerChipProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-lg text-xs">
      <span>{icon}</span>
      <span className="font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide">{label}</span>
      <span className="font-bold text-zinc-900 dark:text-zinc-100">{price}</span>
      <span className={`font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
        {pct}
      </span>
    </div>
  );
}

interface ResaleTickerProps {
  data: XauUsdData;
}

export function ResaleTicker({ data }: ResaleTickerProps) {
  return (
    <div className="flex items-center gap-2">
      {data.xau && (
        <TickerChip
          icon="🪙"
          label="XAU"
          price={fmtBRL(data.xau.price, 2)}
          pct={fmtPct(data.xau.pct)}
          positive={data.xau.pct >= 0}
        />
      )}
      {data.usd && (
        <TickerChip
          icon="💵"
          label="USD"
          price={fmtBRL(data.usd.price, 2)}
          pct={fmtPct(data.usd.pct)}
          positive={data.usd.pct >= 0}
        />
      )}
    </div>
  );
}
