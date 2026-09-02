'use client';

import React, { useMemo } from 'react';

interface Props {
  feedback: { feedback_id: string; descricao: string | null; total: number; compras: number; metal: number }[];
}

function convColor(conv: number): string {
  if (conv >= 95) return '#4ade80';
  if (conv >= 88) return '#D4AF37';
  return '#f87171';
}

export function DashboardMetalFeedback({ feedback }: Props) {
  const items = useMemo(() => {
    return feedback
      .map(f => ({
        sigla: f.feedback_id,
        descricao: f.descricao,
        total: f.total,
        compras: f.compras,
        metal: Number(f.metal.toFixed(2)),
        conv: f.total > 0 ? (f.compras / f.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [feedback]);

  const metalMax = Math.max(0.001, ...items.map(i => i.metal));
  const totalGeral = items.reduce((s, i) => s + i.total, 0);
  const top = items[0];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3 flex items-center gap-1.5">
        <span className="w-1 h-3.5 rounded-full bg-emerald-400" />
        Feedback — Conversão por Tipo
      </h3>

      {items.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-8">Nenhum dado no período</p>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-72 overflow-y-auto pr-0.5">
            <div className="grid grid-cols-[20px_36px_1fr_52px_44px] lg:grid-cols-[24px_44px_1fr_76px_80px_48px] gap-1.5 lg:gap-3 px-1 pb-1.5 mb-1 sticky top-0 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-white/[0.06] text-[9px] lg:text-[10px] font-bold uppercase tracking-wide text-zinc-400">
              <span className="text-center">#</span>
              <span className="text-center">Sigla</span>
              <span className="text-center">Descrição / Volume de Metal</span>
              <span className="text-center hidden lg:block">Peso (g)</span>
              <span className="text-center" title="Compras / Atendimentos">
                <span className="lg:hidden">C/A</span>
                <span className="hidden lg:inline">Compras/Atend.</span>
              </span>
              <span className="text-center">Conv.</span>
            </div>

            <div className="space-y-1.5 pb-2">
              {items.map((f, idx) => {
                const cc = convColor(f.conv);
                return (
                  <div key={f.sigla} className="grid grid-cols-[20px_36px_1fr_52px_44px] lg:grid-cols-[24px_44px_1fr_76px_80px_48px] gap-1.5 lg:gap-3 items-center px-1 py-1 rounded-md hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors duration-100">
                    <span className={`text-[11px] lg:text-xs font-bold ${idx < 3 ? 'text-amber-500' : 'text-zinc-400'}`}>{idx + 1}º</span>
                    <span className="text-[11px] lg:text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">{f.sigla}</span>
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[11px] lg:text-xs text-zinc-500 dark:text-zinc-400 truncate shrink-0 max-w-[45%]">{f.descricao ?? '—'}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(f.metal / metalMax) * 100}%`, background: cc }} />
                      </div>
                    </div>
                    <span className="text-center hidden lg:block text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{f.metal.toFixed(2)}g</span>
                    <span className="text-center text-[10px] lg:text-xs font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{f.compras}/{f.total}</span>
                    <span className="text-center text-[10px] lg:text-xs font-mono font-bold whitespace-nowrap" style={{ color: cc }}>{f.conv.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {top && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-xs text-zinc-600 dark:text-zinc-300">
              <strong>{top.sigla}{top.descricao ? ` (${top.descricao})` : ''}</strong> lidera com {top.total} atend. e {top.conv.toFixed(1)}% de conv. — {((top.total / totalGeral) * 100).toFixed(0)}% do volume.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
