'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { type AgItem } from '@/lib/actions/fetch-resale';

const fmtMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const fmtAxisX = (v: number) => {
  if (v === 0) return 'R$0';
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  return `R$${(v / 1_000).toFixed(0)}k`;
};

interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}

function CustomLabel({ x = 0, y = 0, width = 0, height = 0, value = 0 }: CustomLabelProps) {
  return (
    <text
      x={x + width + 6}
      y={y + height / 2 + 4}
      fill="#71717a"
      fontSize={11}
      textAnchor="start"
    >
      {fmtMoeda(value)}
    </text>
  );
}

// Approximate pixel width of an uppercase string at 11px sans-serif
function estimatePx(label: string): number {
  let w = 0;
  for (const ch of label) {
    if ('MW'.includes(ch))         w += 10;
    else if ('ADGONQCOU'.includes(ch)) w += 8;
    else if (' '.includes(ch))     w += 3;
    else if ('IJ1l'.includes(ch))  w += 4;
    else                            w += 7;
  }
  return w;
}

interface ResaleHBarProps {
  data: AgItem[];
  color: string;
  labelWidth?: number;
  barH?: number;
}

export function ResaleHBar({ data, color, labelWidth, barH = 26 }: ResaleHBarProps) {
  const chartData = data
    .filter(d => d.faturamento > 0 && d.name.trim().length > 0)
    .map(d => ({
      label: `${d.name} (${d.qtd})`,
      value: d.faturamento,
    }));

  // Auto-size YAxis to fit the longest label; passed labelWidth is a minimum, not a cap
  const autoWidth = chartData.reduce((m, d) => Math.max(m, estimatePx(d.label)), 80);
  const actualLabelWidth = Math.max(labelWidth ?? 100, Math.min(autoWidth + 16, 240));

  const height = Math.max(chartData.length * barH + 40, 120);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 95, bottom: 20, left: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={fmtAxisX}
          tick={{ fontSize: 11, fill: '#71717a' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={actualLabelWidth}
          tick={{ fontSize: 11, fill: '#71717a' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value) => [fmtMoeda(Number(value)), 'Faturamento']}
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#f4f4f5',
          }}
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[0, 3, 3, 0]}
          maxBarSize={20}
          isAnimationActive={false}
          label={<CustomLabel />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
