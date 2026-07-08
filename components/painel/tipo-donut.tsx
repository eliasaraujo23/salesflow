'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TipoItem {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: TipoItem[];
  formatter?: (v: number) => string;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtK(v: number) {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2)} Mi`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(2)} Mil`;
  return fmtBRL(v);
}

interface LegendEntry {
  value: string;
  color: string;
}

function CustomLegend({ payload }: { payload?: LegendEntry[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {(payload ?? []).map((e, i) => (
        <div key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
          {e.value}
        </div>
      ))}
    </div>
  );
}

export function TipoDonut({ data, formatter = fmtBRL }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="46%"
          innerRadius="48%"
          outerRadius="72%"
          dataKey="value"
          paddingAngle={2}
          label={({ name, value, cx, cy, midAngle, innerRadius, outerRadius }) => {
            const RADIAN = Math.PI / 180;
            const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            return (
              <text x={x} y={y} fill="#a1a1aa" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                {`${name} ${fmtK(value)}`}
              </text>
            );
          }}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => [formatter(v), '']}
          contentStyle={{
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
