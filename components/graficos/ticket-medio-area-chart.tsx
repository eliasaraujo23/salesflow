'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, LabelList,
} from 'recharts';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtYAxis(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

interface ChartRow {
  mesLabel: string;
  ticketMedio: number;
}

interface CustomLabelProps {
  x?: number;
  y?: number;
  value?: number;
}

function DataLabel({ x = 0, y = 0, value = 0 }: CustomLabelProps) {
  const text = fmtBRL(value);
  const W = Math.max(text.length * 6.5 + 16, 80);
  const H = 22;
  return (
    <g>
      <rect x={x - W / 2} y={y - H - 6} width={W} height={H} rx={5} fill="#3f3f46" />
      <text
        x={x} y={y - H / 2 - 6 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill="#ffffff" fontSize={10} fontWeight={600}
      >
        {text}
      </text>
    </g>
  );
}

interface Props {
  data: ChartRow[];
}

export function TicketMedioAreaChart({ data }: Props) {
  const chartData = useMemo(
    () => data.map(r => ({ ...r })),
    [data],
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 40, right: 70, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
        <XAxis
          dataKey="mesLabel"
          tick={{ fontSize: 12, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={fmtYAxis}
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip
          formatter={(v) => [fmtBRL(Number(v ?? 0)), 'Ticket Médio']}
          labelStyle={{ color: '#a1a1aa', fontSize: 12 }}
          contentStyle={{
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            fontSize: 13,
          }}
        />
        <Area
          type="monotone"
          dataKey="ticketMedio"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#ticketGradient)"
          dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        >
          <LabelList dataKey="ticketMedio" content={DataLabel as any} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
