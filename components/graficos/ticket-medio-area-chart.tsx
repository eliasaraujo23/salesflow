'use client';

import { useMemo } from 'react';
import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
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

interface ChartRow { mesLabel: string; ticketMedio: number; }
interface CustomLabelProps { x?: number; y?: number; width?: number; value?: number; }

function DataLabel({ x = 0, y = 0, width = 0, value = 0 }: CustomLabelProps) {
  const text = fmtBRL(value);
  const W = Math.max(text.length * 6.5 + 16, 80);
  const H = 22;
  const cx = x + width / 2;
  return (
    <g>
      <rect x={cx - W / 2} y={y - H - 6} width={W} height={H} rx={5} fill="#3f3f46" />
      <text
        x={cx} y={y - H / 2 - 6 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fill="#ffffff" fontSize={10} fontWeight={600}
      >
        {text}
      </text>
    </g>
  );
}

const COMMON_AXIS = {
  xAxis: <XAxis dataKey="mesLabel" tick={{ fontSize: 12, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />,
  yAxis: <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} width={64} />,
  grid: <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />,
  tooltip: (
    <Tooltip
      formatter={(v) => [fmtBRL(Number(v ?? 0)), 'Ticket Médio']}
      labelStyle={{ color: '#a1a1aa', fontSize: 12 }}
      contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 13 }}
    />
  ),
};

interface Props {
  data: ChartRow[];
  chartType: 'area' | 'line' | 'bar';
}

export function TicketMedioAreaChart({ data, chartType }: Props) {
  const chartData = useMemo(() => data.map(r => ({ ...r })), [data]);
  const margin = { top: 40, right: 70, left: 8, bottom: 0 };

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={margin}>
          {COMMON_AXIS.grid}
          {COMMON_AXIS.xAxis}
          {COMMON_AXIS.yAxis}
          {COMMON_AXIS.tooltip}
          <Bar dataKey="ticketMedio" fill="#6366f1" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="ticketMedio" content={DataLabel as never} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={margin}>
          {COMMON_AXIS.grid}
          {COMMON_AXIS.xAxis}
          {COMMON_AXIS.yAxis}
          {COMMON_AXIS.tooltip}
          <Line
            type="monotone"
            dataKey="ticketMedio"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          >
            <LabelList dataKey="ticketMedio" content={DataLabel as never} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={margin}>
        <defs>
          <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {COMMON_AXIS.grid}
        {COMMON_AXIS.xAxis}
        {COMMON_AXIS.yAxis}
        {COMMON_AXIS.tooltip}
        <Area
          type="monotone"
          dataKey="ticketMedio"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#ticketGradient)"
          dot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        >
          <LabelList dataKey="ticketMedio" content={DataLabel as never} />
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  );
}
