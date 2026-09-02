'use client';

import React, { useMemo } from 'react';
import { LOJA_TAG_COLORS, isAvDono } from '@/lib/dashboard-metal-sql';
import { getLojaConfig } from '@/lib/controle-config';

interface Props {
  precoAvaliador: { avaliador_id: string; avaliador: string; loja: string; nivel: string; n: number; somaPpg: number }[];
}

const NIVEIS = ['1', '2', '3', '4', '5'] as const;
const COLS = [...NIVEIS, 'geral'] as const;
const COL_LABELS: Record<string, string> = { '1': '1º Preço', '2': '2º Preço', '3': '3º Preço', '4': '4º Preço', '5': '5º Preço', geral: 'Média Geral' };

function fmtPpg(v: number): string {
  return `R$${v.toFixed(2)}/g`;
}

interface RowAgg {
  avId: string;
  av: string;
  loja: string;
  porCol: Record<string, { n: number; med: number }>;
}

export function DashboardMetalPrecoTabela({ precoAvaliador }: Props) {
  const grupos = useMemo(() => {
    const map = new Map<string, RowAgg>();
    for (const r of precoAvaliador) {
      if (isAvDono(r.avaliador_id)) continue;
      const key = `${r.avaliador_id}__${r.loja}`;
      if (!map.has(key)) map.set(key, { avId: r.avaliador_id, av: r.avaliador, loja: r.loja, porCol: {} });
      map.get(key)!.porCol[r.nivel] = { n: r.n, med: r.n > 0 ? r.somaPpg / r.n : 0 };
    }
    for (const row of map.values()) {
      let n = 0, soma = 0;
      for (const nivel of NIVEIS) {
        const d = row.porCol[nivel];
        if (d) { n += d.n; soma += d.med * d.n; }
      }
      row.porCol.geral = { n, med: n > 0 ? soma / n : 0 };
    }
    const rows = [...map.values()].filter(r => (r.porCol.geral?.n ?? 0) > 0);

    const byAv = new Map<string, RowAgg[]>();
    for (const r of rows) {
      if (!byAv.has(r.avId)) byAv.set(r.avId, []);
      byAv.get(r.avId)!.push(r);
    }
    for (const list of byAv.values()) list.sort((a, b) => a.loja.localeCompare(b.loja));

    return [...byAv.entries()].sort((a, b) => a[1][0].av.localeCompare(b[1][0].av));
  }, [precoAvaliador]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/[0.04]">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-amber-400" />
          Comparativo de Preço por Avaliador e Loja
        </h3>
      </div>
      <div className="shrink-0 h-56 overflow-auto">
        <table className="w-full text-xs border-separate border-spacing-0 data-table">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/[0.04] text-[10px] font-bold uppercase tracking-wide text-zinc-400 text-left">Avaliador</th>
              <th className="sticky top-0 z-10 px-3 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/[0.04] text-[10px] font-bold uppercase tracking-wide text-zinc-400">Loja</th>
              {COLS.map(c => (
                <th
                  key={c}
                  className={`sticky top-0 z-10 px-3 py-2 border-b border-zinc-100 dark:border-white/[0.04] text-[10px] font-bold uppercase tracking-wide ${
                    c === 'geral' ? 'bg-amber-50 dark:bg-zinc-800 text-amber-600 dark:text-amber-400' : 'bg-white dark:bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {COL_LABELS[c]}<br /><span className="font-normal normal-case text-[9px] opacity-70">N | R$/g</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 ? (
              <tr><td colSpan={COLS.length + 2} className="py-8 text-center text-zinc-400">Nenhum dado no período</td></tr>
            ) : (
              grupos.map(([avId, list]) => {
                const avName = list[0]?.av ?? avId;
                const min: Record<string, number> = {};
                const max: Record<string, number> = {};
                for (const c of COLS) {
                  const vals = list.map(r => r.porCol[c]?.med).filter((v): v is number => v != null && v > 0);
                  if (vals.length > 1) { min[c] = Math.min(...vals); max[c] = Math.max(...vals); }
                }
                return list.map((row, ri) => {
                  const lojaColor = LOJA_TAG_COLORS[row.loja] ?? '#aaa';
                  const lojaSigla = getLojaConfig(row.loja)?.sigla ?? row.loja;
                  return (
                    <tr
                      key={`${avId}-${row.loja}`}
                      style={{ borderLeft: `3px solid ${lojaColor}` }}
                      className={`transition-colors duration-100 hover:bg-zinc-100 dark:hover:bg-white/[0.06] ${ri === 0 ? 'bg-zinc-50 dark:bg-white/[0.03]' : ''}`}
                    >
                      <td className="px-3 py-1.5 font-semibold text-zinc-700 dark:text-zinc-200">{ri === 0 ? avName : ''}</td>
                      <td className="px-3 py-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: lojaColor, background: `${lojaColor}22` }}>{lojaSigla}</span>
                      </td>
                      {COLS.map(c => {
                        const d = row.porCol[c];
                        if (!d || d.n === 0) return <td key={c} className="px-3 py-1.5 text-center text-zinc-300 dark:text-zinc-700">--</td>;
                        const isMin = min[c] != null && d.med === min[c];
                        const isMax = max[c] != null && d.med === max[c];
                        const color = isMin ? 'text-emerald-500' : isMax ? 'text-red-400' : 'text-zinc-700 dark:text-zinc-200';
                        const arrow = isMin ? ' ▼' : isMax ? ' ▲' : '';
                        return (
                          <td key={c} className={`px-3 py-1.5 text-center ${isMin ? 'bg-emerald-500/5' : isMax ? 'bg-red-500/5' : ''}`}>
                            <div className="text-[10px] text-zinc-400">{d.n}x</div>
                            <div className={`text-xs font-semibold ${color}`}>{fmtPpg(d.med)}{arrow}</div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
