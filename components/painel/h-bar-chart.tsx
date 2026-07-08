'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell,
} from 'recharts';

interface HBarRow {
  name: string;
  value: number;
}

interface Props {
  data: HBarRow[];
  color?: string;
  formatter?: (v: number) => string;
  height?: number;
  maxItems?: number;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function truncate(s: string, n: number) {
  return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

export function HBarChart({ data, color = '#6366f1', formatter = fmtBRL, height, maxItems = 20 }: Props) {
  const rows = data.slice(0, maxItems).map(r => ({
    ...r,
    label: truncate(r.name, 22),
  }));

  const dynamicHeight = height ?? Math.max(180, rows.length * 32 + 40);
  const labelWidth = Math.min(160, Math.max(100, Math.max(...rows.map(r => r.label.length)) * 6.5));

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 80, left: 4, bottom: 4 }}>
        <XAxis
          type="number"
          tickFormatter={v => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
            return String(v);
          }}
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={{ fontSize: 11, fill: '#71717a' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(v) => [formatter(Number(v)), '']}
          contentStyle={{
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#a1a1aa', fontSize: 11 }}
          cursor={{ fill: 'rgba(99,102,241,0.05)' }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {rows.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={1 - i * 0.025} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: unknown) => formatter(Number(v))}
            style={{ fontSize: 11, fill: '#a1a1aa', fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
