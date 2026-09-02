'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { type MensalRow } from '@/lib/actions/dashboard-metal';
import { TEOR_COLORS } from '@/lib/dashboard-metal-sql';

interface Props {
  rows: MensalRow[];
}

const QUALIDADES: { label: string; metalKey: keyof MensalRow; valorKey: keyof MensalRow; color: string }[] = [
  { label: '750 (18K)', metalKey: 'metal_750', valorKey: 'valor_750', color: TEOR_COLORS.ouro_750 },
  { label: '720 (18K)', metalKey: 'metal_720', valorKey: 'valor_720', color: TEOR_COLORS.ouro_720 },
  { label: 'BX (Bx.Teor)', metalKey: 'metal_bx', valorKey: 'valor_bx', color: TEOR_COLORS.bx },
  { label: '24K (Puro)', metalKey: 'metal_24k', valorKey: 'valor_24k', color: TEOR_COLORS.ouro_24k },
  { label: '22K', metalKey: 'metal_22k', valorKey: 'valor_22k', color: TEOR_COLORS.ouro_22k },
  { label: 'PT (Port.)', metalKey: 'metal_pt', valorKey: 'valor_pt', color: TEOR_COLORS.pt },
  { label: 'Platina', metalKey: 'metal_platina', valorKey: 'valor_platina', color: TEOR_COLORS.platina },
];

const PRATA_COLOR = '#7dd3fc';
const PRATA = { label: 'Prata', metalKey: 'metal_prata' as const, valorKey: 'valor_prata' as const, color: PRATA_COLOR };

function fmtValor(v: number): string {
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `R$${(v / 1_000).toFixed(2)}k`;
  return `R$${v.toFixed(2)}`;
}

export function DashboardMetalMetalBars({ rows }: Props) {
  const { items, prata, totalG, totalV, barTotalG, barTotalV } = useMemo(() => {
    const items = QUALIDADES.map(q => ({
      label: q.label,
      color: q.color,
      g: rows.reduce((s, r) => s + (r[q.metalKey] as number), 0),
      v: rows.reduce((s, r) => s + (r[q.valorKey] as number), 0),
    })).filter(i => i.g > 0);
    items.sort((a, b) => b.g - a.g);
    const totalG = items.reduce((s, i) => s + i.g, 0);
    const totalV = items.reduce((s, i) => s + i.v, 0);

    const prataG = rows.reduce((s, r) => s + (r[PRATA.metalKey] as number), 0);
    const prata = prataG > 0
      ? { label: PRATA.label, color: PRATA.color, g: prataG, v: rows.reduce((s, r) => s + (r[PRATA.valorKey] as number), 0) }
      : null;
    const barTotalG = totalG + (prata?.g ?? 0);
    const barTotalV = totalV + (prata?.v ?? 0);

    return { items, prata, totalG, totalV, barTotalG, barTotalV };
  }, [rows]);

  const maxG = Math.max(items[0]?.g ?? 0, prata?.g ?? 0) || 1;

  return (
    <div className="h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-4 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-amber-400" />
        Distribuição de Metal por Tipo (período selecionado)
      </h3>
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="flex-1 min-w-0 space-y-2">
        {items.map(i => {
          const pctG = barTotalG > 0 ? ((i.g / barTotalG) * 100).toFixed(1) : '0';
          return (
            <div key={i.label} className="group flex items-center gap-2">
              <span className="w-24 shrink-0 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: i.color }} />
                {i.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110"
                  style={{ width: `${(i.g / maxG) * 100}%`, background: i.color }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-mono text-zinc-600 dark:text-zinc-300">{i.g.toFixed(2)}g</span>
              <span className="w-10 shrink-0 text-right text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200">{pctG}%</span>
              <span className="w-16 shrink-0 text-right text-xs font-mono text-zinc-500 dark:text-zinc-400">{fmtValor(i.v)}</span>
            </div>
          );
        })}

        {prata && (
          <div className="pt-2 mt-1 border-t border-dashed border-zinc-200 dark:border-white/[0.08]">
            <div className="group flex items-center gap-2">
              <span className="w-24 shrink-0 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: prata.color }} />
                {prata.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110"
                  style={{ width: `${(prata.g / maxG) * 100}%`, background: prata.color }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs font-mono text-zinc-600 dark:text-zinc-300">{prata.g.toFixed(2)}g</span>
              <span className="w-10 shrink-0 text-right text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200">
                {barTotalG > 0 ? ((prata.g / barTotalG) * 100).toFixed(1) : '0'}%
              </span>
              <span className="w-16 shrink-0 text-right text-xs font-mono text-zinc-500 dark:text-zinc-400">{fmtValor(prata.v)}</span>
            </div>
          </div>
        )}

        {(items.length > 0 || prata) && (
          <div className="flex items-center gap-2 pt-2 mt-1 border-t border-zinc-100 dark:border-white/[0.06]">
            <span className="w-24 shrink-0 text-xs font-bold text-zinc-700 dark:text-zinc-200">TOTAL</span>
            <div className="flex-1" />
            <span className="w-20 shrink-0 text-right text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200">{barTotalG.toFixed(2)}g</span>
            <span className="w-10 shrink-0 text-right text-xs font-mono text-zinc-400">100%</span>
            <span className="w-16 shrink-0 text-right text-xs font-mono font-bold text-zinc-700 dark:text-zinc-200">{fmtValor(barTotalV)}</span>
          </div>
        )}
        {items.length === 0 && !prata && (
          <p className="text-center text-sm text-zinc-400 py-4">Nenhum dado no período</p>
        )}
        </div>

        {items.length > 0 && (
          <div className="flex flex-col items-center shrink-0 lg:border-l lg:border-zinc-100 lg:dark:border-white/[0.06] lg:pl-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">Divisão por Teor</p>
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={items} dataKey="g" nameKey="label" innerRadius="58%" outerRadius="90%" stroke="#111111" strokeWidth={2}>
                    {items.map(i => <Cell key={i.label} fill={i.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [`${Number(v).toFixed(2)}g (${((Number(v) / totalG) * 100).toFixed(1)}%)`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: 12, color: '#3f3f46' }}
                    labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
