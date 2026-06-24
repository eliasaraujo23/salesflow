'use client';

import React from 'react';
import { type GapInfo } from '@/hooks/use-partners';

function shortName(n: string): string {
  const parts = n.split(' ');
  return parts.length <= 2 ? n : parts.slice(0, 2).join(' ');
}

interface PartnersGapsProps {
  gaps: GapInfo[];
}

export function PartnersGaps({ gaps }: PartnersGapsProps) {
  if (gaps.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl px-5 py-4 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
        ✓ Todos os carros-chefe cobertos em todos os parceiros
      </div>
    );
  }

  const withStock  = gaps.filter(g => g.stockItems.length > 0).length;
  const withRedist = gaps.filter(g => g.redistFrom.length > 0).length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/[0.04] flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Gaps — Carros-Chefe em Falta
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {gaps.length} {gaps.length === 1 ? 'categoria' : 'categorias'}
        </span>
        {withStock > 0 && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ {withStock} com estoque JM disponível
          </span>
        )}
        {withRedist > 0 && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            ↻ {withRedist} podem ser redistribuídas
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs data-table">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap min-w-[150px]">
                Categoria
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                Parceiros Sem
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap min-w-[160px]">
                Estoque JM Disponível
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap min-w-[200px]">
                Redistribuir De (mais antigo)
              </th>
            </tr>
          </thead>
          <tbody>
            {gaps.map(g => (
              <tr
                key={g.catLabel}
                className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                  {g.catLabel}
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {g.partnersMissing.map(p => (
                      <span
                        key={p}
                        className="text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded"
                      >
                        {shortName(p)}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="px-4 py-3">
                  {g.stockItems.length === 0 ? (
                    <span className="text-zinc-300 dark:text-zinc-600">—</span>
                  ) : (
                    <div>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {g.stockItems.length} {g.stockItems.length === 1 ? 'peça' : 'peças'}
                      </span>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex flex-wrap gap-1">
                        {g.stockItems.slice(0, 3).map(s => (
                          <span key={s.referencia} className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                            {s.referencia}
                          </span>
                        ))}
                        {g.stockItems.length > 3 && (
                          <span className="text-zinc-400 dark:text-zinc-500">+{g.stockItems.length - 3}</span>
                        )}
                      </div>
                    </div>
                  )}
                </td>

                <td className="px-4 py-3">
                  {g.redistFrom.length === 0 ? (
                    <span className="text-zinc-300 dark:text-zinc-600">—</span>
                  ) : (
                    <div className="space-y-1.5">
                      {g.redistFrom.slice(0, 2).map(r => (
                        <div key={r.partner} className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {shortName(r.partner)} ×{r.count}
                          </span>
                          <span className="text-zinc-300 dark:text-zinc-600">→</span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400">
                            {r.oldest.referencia || '—'}
                          </span>
                          <span className={`font-semibold ${
                            r.oldest.dias_campo > 90
                              ? 'text-red-500 dark:text-red-400'
                              : r.oldest.dias_campo >= 75
                              ? 'text-amber-500 dark:text-amber-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}>
                            {r.oldest.dias_campo}d
                          </span>
                        </div>
                      ))}
                      {g.redistFrom.length > 2 && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          +{g.redistFrom.length - 2} outros
                        </span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
