'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/card';

type VendaMes = {
  mes: string;
  qtd: number;
  total: number;
};

const fmtMes = (s: string) => {
  if (!s) return '—';
  const [y, m] = s.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
};

const fmtMoedaK = (n: number) =>
  n >= 1000
    ? `R$${(n / 1000).toFixed(0)}k`
    : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--c-surface, #13141a)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: '#e8eaf0', fontWeight: 600 },
};

interface FabVendasChartProps {
  data: VendaMes[];
}

export function FabVendasChart({ data }: FabVendasChartProps) {
  const chartData = data.map(d => ({ ...d, mesLabel: fmtMes(d.mes) }));

  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-sm">📈 Vendas por Mês (12m)</CardTitle>
      </CardHeader>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="mesLabel"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={fmtMoedaK}
              tick={{ fill: '#22c55e', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value, name) => {
                const n = Number(value);
                return name === 'Faturamento' ? [fmtMoedaK(n), name] : [`${n} peças`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Bar
              yAxisId="left"
              dataKey="qtd"
              name="Qtd vendida"
              fill="#4f6ef7"
              radius={[4, 4, 0, 0]}
              opacity={0.85}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total"
              name="Faturamento"
              stroke="#22c55e"
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
