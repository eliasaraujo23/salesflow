'use client';

import React from 'react';

interface AnaliseKpiCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}

export function AnaliseKpiCard({ label, value, sub, highlight }: AnaliseKpiCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono tabular-nums ${highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}
