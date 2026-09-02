'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { type MensalRow } from '@/lib/actions/dashboard-metal';
import { useIsMobile } from '@/hooks/use-is-mobile';

interface Props {
  rows: MensalRow[];
}

function fmtPct(v: number): string {
  return (v * 100).toFixed(1).replace('.', ',') + '%';
}

const ORDEM_TOOLTIP: Record<string, number> = { Atendimentos: 0, Fechamentos: 1, 'Conversão': 2 };

export function DashboardMetalComboAtendimentos({ rows }: Props) {
  const isMobile = useIsMobile();
  const data = useMemo(() => {
    const map = new Map<string, { mes: string; atendimentos: number; fechamentos: number }>();
    for (const r of rows) {
      const cur = map.get(r.ano_mes) ?? { mes: r.ano_mes, atendimentos: 0, fechamentos: 0 };
      cur.atendimentos += r.aval_s4;
      cur.fechamentos += r.compras;
      map.set(r.ano_mes, cur);
    }
    return [...map.values()]
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map(d => ({ ...d, conversao: d.atendimentos > 0 ? d.fechamentos / d.atendimentos : 0 }));
  }, [rows]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-indigo-400" />
        Atendimentos &amp; Fechamentos
      </h3>
      <ResponsiveContainer width="100%" height={370}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.3} />
          <XAxis
            dataKey="mes"
            tick={isMobile ? false : { fontSize: 11, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={false}
            height={isMobile ? 4 : 30}
          />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tickFormatter={fmtPct} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
            labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
            formatter={(v, name) => (name === 'Conversão' ? [fmtPct(Number(v)), name] : [v, name])}
            itemSorter={item => ORDEM_TOOLTIP[String(item.name)] ?? 99}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="atendimentos" name="Atendimentos" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="fechamentos" name="Fechamentos" fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="conversao" name="Conversão" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
