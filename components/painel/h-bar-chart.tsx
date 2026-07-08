'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell,
} from 'recharts';

interface HBarRow {
  name: string;
  value: number;
  qty?: number;          // se fornecido: label esquerdo mostra "NAME (qty)"
  displayLabel?: string; // substitui formatter(value) na etiqueta direita
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

// Estimativa de largura em px para fonte 12px maiúscula (igual ResaleHBar)
function estimatePx(label: string): number {
  let w = 0;
  for (const ch of label) {
    if ('MW'.includes(ch))             w += 12;
    else if ('ADGONQCOU'.includes(ch)) w += 10;
    else if (ch === ' ')               w += 4;
    else if ('IJ1l'.includes(ch))      w += 5;
    else                               w += 8;
  }
  return w;
}

function CustomYAxisTick(props: { x?: number; y?: number; payload?: { value: string } }) {
  const { x = 0, y = 0, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-4} y={0} textAnchor="end" dominantBaseline="central" fill="#71717a" fontSize={12}>
        {payload?.value}
      </text>
    </g>
  );
}

export function HBarChart({ data, color = '#6366f1', formatter = fmtBRL, height, maxItems }: Props) {
  const rows = (maxItems != null ? data.slice(0, maxItems) : data).map(r => ({
    ...r,
    label: r.qty != null ? `${r.name} (${r.qty})` : r.name,
  }));

  const autoWidth = rows.reduce((m, r) => Math.max(m, estimatePx(r.label)), 80);
  const labelWidth = Math.min(240, Math.max(80, autoWidth + 16));

  const dynamicHeight = height ?? Math.max(180, rows.length * 30 + 40);

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 90, bottom: 20, left: 0 }}>
        <XAxis
          type="number"
          tickFormatter={v => {
            if (v === 0) return 'R$0';
            if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
            return String(v);
          }}
          tick={{ fontSize: 12, fill: '#71717a' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tick={<CustomYAxisTick />}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <Tooltip
          formatter={(v) => [formatter(Number(v)), '']}
          contentStyle={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: 8,
            fontSize: 12,
            color: '#18181b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          labelStyle={{ color: '#71717a', fontSize: 11 }}
          cursor={{ fill: 'rgba(99,102,241,0.05)' }}
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={22} minPointSize={3} isAnimationActive={false}>
          {rows.map((_, i) => (
            <Cell key={i} fill={color} fillOpacity={1 - i * 0.025} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            content={(props: unknown) => {
              const p = props as { x?: number; y?: number; width?: number; height?: number; value?: unknown; index?: number };
              const row = rows[p.index ?? 0];
              const txt = row?.displayLabel ?? formatter(Number(p.value));
              return (
                <text
                  x={(p.x ?? 0) + (p.width ?? 0) + 6}
                  y={(p.y ?? 0) + (p.height ?? 0) / 2}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="#71717a"
                  fontWeight={600}
                >
                  {txt}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
