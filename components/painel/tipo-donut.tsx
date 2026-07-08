'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

export function TipoDonut({ data, formatter = fmtBRL }: Props) {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col items-center justify-center gap-4 h-full py-2">
      {/* Donut — tamanho proporcional ao container */}
      <div className="w-[min(100%,260px)] aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              dataKey="value"
              paddingAngle={2}
              labelLine={false}
            >
              {sorted.map((entry, i) => (
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
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Lista — itens em linha, quebra se necessário */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
        {sorted.map(item => (
          <div key={item.name} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{item.name}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">{formatter(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
