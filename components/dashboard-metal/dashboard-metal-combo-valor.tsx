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

function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtG(v: number): string {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}g`;
}

export function DashboardMetalComboValor({ rows }: Props) {
  const isMobile = useIsMobile();
  const data = useMemo(() => {
    const map = new Map<string, { mes: string; metal: number; valor: number }>();
    for (const r of rows) {
      const cur = map.get(r.ano_mes) ?? { mes: r.ano_mes, metal: 0, valor: 0 };
      cur.metal += r.metal;
      cur.valor += r.valor;
      map.set(r.ano_mes, cur);
    }
    return [...map.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }, [rows]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-amber-400" />
        Metal Comprado (g) &amp; Valor Investido (R$)
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
          <YAxis yAxisId="left" tickFormatter={fmtG} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={fmtBRL} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
            labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
            formatter={(v, name) =>
              name === 'valor' ? [fmtBRL(Number(v)), 'Valor Investido'] : [fmtG(Number(v)), 'Metal Comprado']
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="metal" name="metal" fill="#f59e0b" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
          <Line yAxisId="right" type="monotone" dataKey="valor" name="valor" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
