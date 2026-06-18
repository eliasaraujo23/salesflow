'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/card';

type VendaPedra = {
  tipo_pedra: string;
  qtd: number;
  ticket_medio: number;
};

const CORES = [
  '#4f6ef7', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
];

const fmtMoeda = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

interface FabPedrasChartProps {
  data: VendaPedra[];
}

export function FabPedrasChart({ data }: FabPedrasChartProps) {
  return (
    <Card variant="bordered">
      <CardHeader>
        <CardTitle className="text-sm">💎 Top Pedras Vendidas</CardTitle>
      </CardHeader>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="tipo_pedra"
              type="category"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--c-surface, #13141a)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#e8eaf0', fontWeight: 600 }}
              formatter={(value, _, item) => {
                const pedra = item.payload as VendaPedra;
                return [`${Number(value)} vendidos · TM ${fmtMoeda(pedra.ticket_medio)}`, 'Vendidas'];
              }}
            />
            <Bar dataKey="qtd" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={`${CORES[i % CORES.length]}cc`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
