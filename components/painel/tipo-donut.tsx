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
          label={(props) => {
            const { name, value, cx, cy, midAngle, innerRadius, outerRadius } = props as {
              name?: string; value?: number; cx?: number; cy?: number;
              midAngle?: number; innerRadius?: number; outerRadius?: number;
            };
            if (cx == null || cy == null || innerRadius == null || outerRadius == null) return null;
            const RADIAN = Math.PI / 180;
            const radius = innerRadius + (outerRadius - innerRadius) * 1.35;
            const x = cx + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
            const y = cy + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
            return (
              <text x={x} y={y} fill="#a1a1aa" textAnchor={x > (cx ?? 0) ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                {`${name ?? ''} ${fmtBRL(value ?? 0)}`}
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
          formatter={(v) => [formatter(Number(v)), '']}
          contentStyle={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: 8,
            fontSize: 12,
            color: '#18181b',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        />
        <Legend content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
