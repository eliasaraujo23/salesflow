'use client';

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { type EvolucaoParceiroItem } from '@/lib/actions/fetch-evolucao-parceiros';

const TOP_N = 8;

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#f97316',
  '#a3a3a3',
];

function fmtMes(mes: string) {
  const [y, m] = mes.split('-');
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${names[parseInt(m) - 1]}/${y.slice(2)}`;
}

function fmtBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString('pt-BR')}`;
}

interface Props {
  data: EvolucaoParceiroItem[];
}

export function EvolucaoParceiroChart({ data }: Props) {
  const { chartData, topParceiros } = useMemo(() => {
    // Sum total per partner across all months
    const totals = new Map<string, number>();
    data.forEach(r => {
      totals.set(r.destino, (totals.get(r.destino) ?? 0) + r.faturamento);
    });

    // Top N partners by total revenue
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, TOP_N).map(([d]) => d);
    const hasOthers = sorted.length > TOP_N;

    // Get sorted unique months
    const months = [...new Set(data.map(r => r.mes))].sort();

    // Build chart rows
    const rows = months.map(mes => {
      const row: Record<string, string | number> = { mes: fmtMes(mes) };
      let outros = 0;
      data.filter(r => r.mes === mes).forEach(r => {
        if (top.includes(r.destino)) {
          row[r.destino] = (Number(row[r.destino] ?? 0)) + r.faturamento;
        } else {
          outros += r.faturamento;
        }
      });
      if (hasOthers && outros > 0) row['Outros'] = outros;
      return row;
    });

    const parceiros = [...top, ...(hasOthers ? ['Outros'] : [])];
    return { chartData: rows, topParceiros: parceiros };
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl min-w-[200px]">
        <div className="text-xs font-bold text-zinc-300 mb-2">{label}</div>
        {[...payload].reverse().map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs py-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.fill }} />
              <span className="text-zinc-400 truncate max-w-[120px]">{p.dataKey}</span>
            </span>
            <span className="font-semibold text-zinc-200">{fmtBRL(p.value)}</span>
          </div>
        ))}
        <div className="border-t border-white/10 mt-2 pt-2 flex justify-between text-xs">
          <span className="text-zinc-500">Total</span>
          <span className="font-bold text-indigo-400">{fmtBRL(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barSize={36}>
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 12, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend
          formatter={(v) => (
            <span className="text-[11px] text-zinc-400">{v}</span>
          )}
          wrapperStyle={{ paddingTop: 16 }}
        />
        {topParceiros.map((p, i) => (
          <Bar key={p} dataKey={p} stackId="a" fill={COLORS[i] ?? '#a3a3a3'} radius={i === topParceiros.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
