'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

const TIPO_COLORS: Record<string, string> = {
  JF: '#6366f1', JM: '#a855f7', JR: '#10b981', JC: '#f59e0b',
};

const TIPOS = ['JR', 'JF', 'JM', 'JC'] as const;

export interface StackedDestinoRow {
  name: string;
  qtd: number;
  total: number;
  JR: number;
  JF: number;
  JM: number;
  JC: number;
}

interface Props {
  data: StackedDestinoRow[];
  formatter?: (v: number) => string;
  fill?: boolean;
  height?: number;
  maxItems?: number;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

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

type StackEntry = { name: string; value: number; color: string; payload: StackedDestinoRow & { label: string } };

export function StackedHBarChart({ data, formatter = fmtBRL, fill = false, height, maxItems }: Props) {
  const rows = (maxItems != null ? data.slice(0, maxItems) : data).map(r => ({
    ...r,
    label: `${r.name} (${r.qtd})`,
  }));

  const autoWidth = rows.reduce((m, r) => Math.max(m, estimatePx(r.label)), 80);
  const labelWidth = Math.min(240, Math.max(80, autoWidth + 16));
  const dynamicHeight: number | `${number}%` = fill ? '100%' : (height ?? Math.max(180, rows.length * 30 + 40));
  const maxBar = fill ? 48 : 22;

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
          content={(props: unknown) => {
            const p = props as { active?: boolean; payload?: StackEntry[] };
            if (!p.active || !p.payload?.length) return null;
            const row = p.payload[0].payload;
            const nonZero = p.payload.filter(s => s.value > 0);
            if (!nonZero.length) return null;
            return (
              <div style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12, color: '#18181b', padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <p style={{ fontWeight: 600, margin: '0 0 6px', color: '#71717a' }}>{row.label}</p>
                {nonZero.map(s => (
                  <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                    <span style={{ color: TIPO_COLORS[s.name] ?? s.color, fontWeight: 700 }}>{s.name}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatter(s.value)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #e4e4e7', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatter(row.total)}</span>
                </div>
              </div>
            );
          }}
          cursor={{ fill: 'rgba(99,102,241,0.05)' }}
        />
        {TIPOS.map((tipo, idx) => (
          <Bar
            key={tipo}
            dataKey={tipo}
            stackId="a"
            fill={TIPO_COLORS[tipo]}
            maxBarSize={maxBar}
            isAnimationActive={false}
          >
            {idx === TIPOS.length - 1 && (
              <LabelList
                dataKey={tipo}
                position="right"
                content={(props: unknown) => {
                  const p = props as { x?: number; y?: number; width?: number; height?: number; index?: number };
                  const row = rows[p.index ?? 0];
                  if (!row) return null;
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
                      {formatter(row.total)}
                    </text>
                  );
                }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
