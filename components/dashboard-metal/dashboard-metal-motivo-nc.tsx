'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { MOTIVO_NC_LABELS, NC_GRUPO_LABELS, NC_GRUPO_COLORS, getNcGrupo, NC_GRUPOS } from '@/lib/dashboard-metal-sql';

interface Props {
  motivoNc: { cod: string; total: number; peso: number }[];
}

export function DashboardMetalMotivoNc({ motivoNc }: Props) {
  const items = useMemo(() => {
    return motivoNc
      .map(m => ({
        cod: m.cod,
        label: MOTIVO_NC_LABELS[m.cod] ?? `Motivo ${m.cod}`,
        total: m.total,
        peso: m.peso,
        grupo: getNcGrupo(m.cod),
      }))
      .sort((a, b) => b.total - a.total);
  }, [motivoNc]);

  const max = items[0]?.total ?? 1;
  const tot = items.reduce((s, i) => s + i.total, 0);
  const totPeso = items.reduce((s, i) => s + i.peso, 0);
  const top = items[0];
  const precoNC = items.filter(i => i.grupo === 'preco').reduce((s, i) => s + i.total, 0);

  const grupoTotals = useMemo(() => {
    const g: Record<string, number> = { preco: 0, peca: 0, processo: 0 };
    for (const i of items) g[i.grupo] += i.total;
    return g;
  }, [items]);

  const donutData = (Object.keys(NC_GRUPOS) as (keyof typeof NC_GRUPOS)[])
    .map(k => ({ key: k, label: NC_GRUPO_LABELS[k], color: NC_GRUPO_COLORS[k], value: grupoTotals[k] }))
    .filter(d => d.value > 0);

  return (
    <div className="h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-red-400" />
        Motivo de Não Compra — Análise de Perda
      </h3>

      {items.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-8">Nenhum dado no período</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="h-72 overflow-y-auto pr-0.5">
              <div className="flex items-center gap-1.5 lg:gap-2 pb-1.5 mb-1 sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/[0.06] text-[9px] lg:text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                <span className="w-4 lg:w-5 shrink-0 text-center">#</span>
                <span className="w-20 lg:w-40 shrink-0 text-center">Motivo</span>
                <span className="flex-1 text-center">Volume</span>
                <span className="w-6 lg:w-8 shrink-0 text-center">Casos</span>
                <span className="hidden sm:block w-10 shrink-0 text-center">%</span>
                <span className="w-12 lg:w-16 shrink-0 text-center">Peso</span>
              </div>
              <div className="space-y-1.5 pb-2">
                {items.map(i => (
                  <div key={i.cod} className="flex items-center gap-1.5 lg:gap-2 py-0.5 rounded-md hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors duration-100">
                    <span className="w-4 lg:w-5 shrink-0 text-center text-[10px] lg:text-[11px] font-mono text-amber-600 dark:text-amber-400">{i.cod}</span>
                    <span className="w-20 lg:w-40 shrink-0 text-center text-[11px] lg:text-xs text-zinc-600 dark:text-zinc-300 truncate">{i.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(i.total / max) * 100}%`, background: NC_GRUPO_COLORS[i.grupo] }} />
                    </div>
                    <span className="w-6 lg:w-8 shrink-0 text-center text-[11px] lg:text-xs font-mono text-zinc-700 dark:text-zinc-200">{i.total}</span>
                    <span className="hidden sm:block w-10 shrink-0 text-center text-xs font-mono text-zinc-400">{((i.total / tot) * 100).toFixed(1)}%</span>
                    <span className="w-12 lg:w-16 shrink-0 text-center text-[11px] lg:text-xs font-mono text-emerald-600 dark:text-emerald-400">{i.peso.toFixed(2)}g</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 lg:gap-2 pt-2 mt-1 border-t border-zinc-100 dark:border-white/[0.06]">
              <span className="w-4 lg:w-5 shrink-0" />
              <span className="w-20 lg:w-40 shrink-0 text-center text-[11px] lg:text-xs font-bold text-amber-600 dark:text-amber-400">TOTAL</span>
              <div className="flex-1" />
              <span className="w-6 lg:w-8 shrink-0 text-center text-[11px] lg:text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{tot}</span>
              <span className="hidden sm:block w-10 shrink-0 text-center text-xs font-mono text-zinc-400">100%</span>
              <span className="w-12 lg:w-16 shrink-0 text-center text-[11px] lg:text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{totPeso.toFixed(2)}g</span>
            </div>
          </div>

          <div className="lg:w-36 shrink-0">
            <p className="text-[10px] text-center font-semibold uppercase tracking-wide text-zinc-400 mb-1">Por Categoria</p>
            <div style={{ height: 130 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="90%" stroke="#111" strokeWidth={2}>
                    {donutData.map(d => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${v} casos`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
                    labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap lg:block justify-center gap-x-3 gap-y-1 lg:space-y-1 mt-1">
              {donutData.map(d => (
                <div key={d.key} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-zinc-400">{d.label}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {top && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-300">
          <strong>{top.label}</strong> lidera: {top.total} casos | {top.peso.toFixed(2)}g. Total não comprado: <strong>{totPeso.toFixed(2)}g</strong>. {((precoNC / tot) * 100).toFixed(0)}% por preço.
        </div>
      )}
    </div>
  );
}
