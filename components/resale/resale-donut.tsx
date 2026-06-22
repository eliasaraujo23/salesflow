'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { type DonutItem } from '@/lib/actions/fetch-resale';

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface ResaleDonutProps {
  data: DonutItem[];
  size?: number;
  fullHeight?: boolean;
  horizontal?: boolean;
}

export function ResaleDonut({ data, size = 160, fullHeight = false, horizontal = false }: ResaleDonutProps) {
  const filtered = data.filter(d => d.faturamento > 0);

  if (filtered.length === 0) {
    return <div className="flex items-center justify-center h-20 text-xs text-zinc-500 dark:text-zinc-400">Sem dados</div>;
  }

  const legend = (
    <div className={`flex ${horizontal ? 'flex-col gap-1 justify-center' : 'flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2 px-2'}`}>
      {filtered.map((d, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{d.name}</span>
          <span className="text-[10px] font-semibold text-zinc-900 dark:text-zinc-100">{fmtMoeda(d.faturamento)}</span>
        </div>
      ))}
    </div>
  );

  if (horizontal) {
    return (
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="shrink-0 self-stretch aspect-square">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={filtered} dataKey="faturamento" nameKey="name" innerRadius="50%" outerRadius="75%" startAngle={90} endAngle={-270} isAnimationActive={false}>
                {filtered.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(value) => [fmtMoeda(Number(value)), 'Faturamento']} contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px', color: '#f4f4f5' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {legend}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${fullHeight ? 'h-full' : ''}`}>
      <ResponsiveContainer width="100%" height={fullHeight ? '100%' : size}>
        <PieChart>
          <Pie data={filtered} dataKey="faturamento" nameKey="name" innerRadius="55%" outerRadius="78%" startAngle={90} endAngle={-270} isAnimationActive={false}>
            {filtered.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(value) => [fmtMoeda(Number(value)), 'Faturamento']} contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px', color: '#f4f4f5' }} />
        </PieChart>
      </ResponsiveContainer>
      {legend}
    </div>
  );
}
