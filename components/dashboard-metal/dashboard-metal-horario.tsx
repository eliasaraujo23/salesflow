'use client';

import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Props {
  horario: { slot: number; total: number; compras: number }[];
}

function slotLabel(slot: number): string {
  const h = Math.floor(slot / 60);
  const m = slot % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function convColor(conv: number): string {
  if (conv >= 90) return '#4ade80';
  if (conv >= 82) return '#D4AF37';
  return '#f87171';
}

export function DashboardMetalHorario({ horario }: Props) {
  const data = useMemo(() => {
    return [...horario]
      .sort((a, b) => a.slot - b.slot)
      .map(h => ({
        slot: h.slot,
        label: slotLabel(h.slot),
        total: h.total,
        compras: h.compras,
        conv: h.total > 0 ? (h.compras / h.total) * 100 : 0,
      }));
  }, [horario]);

  const picos = useMemo(() => [...data].sort((a, b) => b.total - a.total).slice(0, 3), [data]);
  const pico = picos[0];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-indigo-400" />
        Movimentação por Horário — intervalos de 30 min
      </h3>

      {data.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-8">Nenhum dado no período</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-2">
            {picos.map((p, i) => (
              <div key={p.slot} className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-600/30 text-center hover:bg-amber-500/15 transition-colors duration-150">
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{p.label}</div>
                <div className="text-[10px] text-amber-700/80 dark:text-amber-400/70">#{i + 1} pico — {p.total} atend.</div>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={190}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval={data.length > 14 ? 1 : 0} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
              <Tooltip
                labelFormatter={(l) => `${l}-${slotLabel((data.find(d => d.label === l)?.slot ?? 0) + 29)}`}
                formatter={(v, name) =>
                  name === 'conv' ? [`${Number(v).toFixed(1)}%`, 'Conversão'] : [v, name === 'total' ? 'Atendimentos' : 'Fechamentos']
                }
                contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
                labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
              />
              <Bar yAxisId="left" dataKey="total" name="total" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="left" dataKey="compras" name="compras" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conv"
                name="conv"
                stroke="#e5e5e5"
                strokeWidth={2}
                dot={(props: { cx?: number; cy?: number; payload?: { conv: number } }) => {
                  const { cx, cy, payload } = props;
                  if (cx == null || cy == null || !payload) return <React.Fragment />;
                  return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={convColor(payload.conv)} stroke="none" />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {pico && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-300">
              <strong className="text-amber-600 dark:text-amber-400">Pico:</strong> {pico.label} com {pico.total} atend. ({pico.conv.toFixed(1)}% conv.)
            </div>
          )}
        </>
      )}
    </div>
  );
}
