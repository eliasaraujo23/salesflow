'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { type MatrixRow } from '@/hooks/use-partners';

function shortName(n: string): string {
  return n.split(' ').slice(0, 2).join(' ');
}

interface PartnersMatrixProps {
  rows: MatrixRow[];
  partners: string[];
}

export function PartnersMatrix({ rows, partners }: PartnersMatrixProps) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  function toggle(catIdx: number) {
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(catIdx)) next.delete(catIdx);
      else next.add(catIdx);
      return next;
    });
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm data-table">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap min-w-[160px]">
                ★ Categoria
              </th>
              {partners.map(p => (
                <th
                  key={p}
                  className="px-2 py-2.5 text-center text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
                >
                  {shortName(p)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isOpen = open.has(row.catIdx);
              const hasAny = row.total > 0;
              const hasVariants = row.variants.length > 0;

              return (
                <React.Fragment key={row.catIdx}>
                  <tr
                    onClick={() => hasAny && hasVariants && toggle(row.catIdx)}
                    className={`border-b border-zinc-100 dark:border-white/[0.04] transition-colors ${
                      hasAny && hasVariants ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {hasAny && hasVariants ? (
                          isOpen ? (
                            <ChevronDown size={11} className="text-zinc-400 shrink-0" />
                          ) : (
                            <ChevronRight size={11} className="text-zinc-400 shrink-0" />
                          )
                        ) : (
                          <span className="w-[11px] shrink-0" />
                        )}
                        {row.label}
                      </span>
                    </td>
                    {row.counts.map((c, pi) => (
                      <td key={pi} className="px-2 py-2.5">
                        <span
                          className={`block text-center text-xs font-bold rounded px-1 py-0.5 ${
                            c > 0
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-500/10 text-red-500 dark:text-red-400'
                          }`}
                        >
                          {c > 0 ? c : '—'}
                        </span>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center text-xs font-bold text-amber-600 dark:text-amber-400">
                      {row.total || '—'}
                    </td>
                  </tr>

                  {isOpen &&
                    row.variants.map((v, vi) => (
                      <tr
                        key={vi}
                        className="border-b border-zinc-100 dark:border-white/[0.04] bg-zinc-50 dark:bg-zinc-800/30"
                      >
                        <td className="pl-8 pr-4 py-2 text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          <span className="opacity-50 mr-1">└</span>
                          {v.sub} · {v.pedra} · {v.lap}
                        </td>
                        {v.counts.map((c, pi) => (
                          <td key={pi} className="px-2 py-2 text-center text-[11px] font-semibold">
                            {c > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">{c}</span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-600">·</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                          {v.total}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
