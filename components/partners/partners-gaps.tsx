'use client';

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { type GapInfo } from '@/hooks/use-partners';
import { RedistCell } from '@/components/partners/redist-cell';

function shortName(n: string): string {
  const parts = n.split(' ');
  return parts.length <= 2 ? n : parts.slice(0, 2).join(' ');
}

interface PartnersGapsProps {
  gaps: GapInfo[];
}

export function PartnersGaps({ gaps }: PartnersGapsProps) {
  const [search, setSearch] = useState('');

  const filteredGaps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? gaps.filter(g => g.catLabel.toLowerCase().includes(q)) : gaps;
    return [...base].sort((a, b) => a.catLabel.localeCompare(b.catLabel, 'pt-BR'));
  }, [gaps, search]);

  if (gaps.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl px-5 py-4 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
        ✓ Todos os carros-chefe cobertos em todos os parceiros
      </div>
    );
  }

  const withRedist = filteredGaps.filter(g => g.redistFrom.length > 0).length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.13] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/[0.04] flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Por Carro Chefe — Em Falta
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {filteredGaps.length} {filteredGaps.length === 1 ? 'categoria' : 'categorias'}
        </span>
        {withRedist > 0 && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            ↻ {withRedist} podem ser redistribuídas
          </span>
        )}
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar carro-chefe..."
            className="pl-7 pr-7 py-1 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.13] rounded-lg text-zinc-700 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 w-48"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {filteredGaps.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
          Nenhum carro-chefe encontrado para &quot;{search}&quot;.
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs data-table">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-100 dark:border-white/[0.04]">
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap min-w-[150px]">
                Categoria
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap min-w-[160px]">
                Tem
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-red-500 dark:text-red-400 whitespace-nowrap min-w-[160px]">
                Não Tem
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 whitespace-nowrap min-w-[220px]">
                Redistribuir De (mais antigo)
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredGaps.map(g => {
              return (
              <tr
                key={g.catLabel}
                className="border-b border-zinc-100 dark:border-white/[0.04] hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors align-top"
              >
                <td className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                  {g.catLabel}
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {g.partnersHave.length === 0 ? (
                      <span className="text-zinc-300 dark:text-zinc-600 text-[10px]">—</span>
                    ) : g.partnersHave.map(h => (
                      <span
                        key={h.partner}
                        className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded"
                      >
                        {shortName(h.partner)}
                        {h.count > 1 && <span className="opacity-70">×{h.count}</span>}
                        <span className="opacity-50">{h.tipos.join('/')}</span>
                      </span>
                    ))}
                  </div>
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
                  <RedistCell redistFrom={g.redistFrom} />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
