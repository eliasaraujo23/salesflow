'use client';

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

interface BarItem { name: string; q: number; color: string }

interface Props {
  title: string;
  data: BarItem[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: BarItem }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-zinc-100 mb-1">{d.name}</div>
      <div className="text-zinc-300">{d.q} peças vendidas</div>
    </div>
  );
};

export function AnaliseBarChart({ title, data }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-4">{title}</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="q" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#71717a', formatter: (v: number) => v }}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
