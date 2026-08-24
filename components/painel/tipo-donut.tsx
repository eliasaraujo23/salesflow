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
    <div className="flex flex-row items-center justify-center h-full w-full py-2 gap-3 md:gap-4">
      {/* Donut — tamanho fixo, sempre na mesma posição pois a legenda ao lado tem largura fixa */}
      <div className="w-[140px] md:w-[200px] aspect-square shrink-0">
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

      {/* Lista — largura fixa para o donut não se deslocar entre cards com legendas diferentes */}
      <div className="flex flex-col justify-center gap-2 w-[165px] md:w-[220px] shrink-0">
        {sorted.map(item => (
          <div key={item.name} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="text-xs md:text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 truncate">{item.name}</span>
            <span className="text-xs md:text-[13px] text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap ml-auto">{formatter(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
